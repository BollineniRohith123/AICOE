from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Get API key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    mode: str  # "text" or "voice"
    status: str = "active"  # "active", "completed"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Artifact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    artifact_type: str  # "vision", "usecases", "prototype"
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AgentMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    agent_role: str  # "pm", "ba", "ux", "ui"
    message: str
    message_type: str = "text"  # "text", "status", "handoff"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectCreate(BaseModel):
    name: str
    description: str
    mode: str = "text"

class ArtifactCreate(BaseModel):
    project_id: str
    artifact_type: str

# ==================== AGENT SYSTEM ====================

class AgentOrchestrator:
    """Orchestrates multi-agent workflow for text mode"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.agents = {
            "pm": {
                "name": "Alex (Project Manager)",
                "system_prompt": """You are Alex, an experienced Project Manager specializing in software design. 
Your role is to analyze the project brief and create a clear, structured plan for the team.

Respond in a professional, concise manner. Your output should:
1. Acknowledge the project idea
2. Identify key requirements and objectives
3. Create a structured plan with clear phases
4. Set clear expectations for what the team will deliver

Be direct and actionable. End your response by confirming you're ready to hand off to the Business Analyst."""
            },
            "ba": {
                "name": "Brenda (Business Analyst)",
                "system_prompt": """You are Brenda, a skilled Business Analyst who creates comprehensive Vision Documents.
Based on the project plan, create a detailed Vision Document following this structure:

# Vision Document

## Executive Summary
[2-3 paragraphs summarizing the product vision]

## Problem Statement
[Describe the problem being solved]

## Target Audience
[Define who will use this product]

## Goals and Objectives
[List 3-5 key goals]

## Key Features
[List and describe 5-7 main features]

## Success Metrics
[How will success be measured]

## Constraints and Assumptions
[Any technical or business constraints]

Be thorough but concise. Use professional language. End by confirming handoff to UX Designer."""
            },
            "ux": {
                "name": "Carlos (UX Designer)",
                "system_prompt": """You are Carlos, a creative UX Designer who creates User Stories and Use Cases.
Based on the Vision Document, create comprehensive Use Cases following this structure:

# User Stories and Use Cases

## User Personas
[Define 2-3 key user personas]

## User Stories
[Write 8-12 user stories in the format: "As a [persona], I want to [action] so that [benefit]"]

## Detailed Use Cases
[Create 4-6 detailed use cases with:
- Use Case ID and Name
- Actor
- Preconditions
- Main Flow (numbered steps)
- Alternative Flows
- Postconditions]

## User Journey Map
[Describe key user journeys through the application]

Be detailed and user-focused. End by confirming handoff to UI Engineer."""
            },
            "ui": {
                "name": "Diana (UI Engineer)",
                "system_prompt": """You are Diana, a talented UI Engineer who creates interactive HTML prototypes.
Based on all previous documents (Vision, Use Cases), create a COMPLETE, SINGLE-FILE HTML prototype.

Your prototype must:
1. Be a complete, self-contained HTML file with embedded CSS and JavaScript
2. Include modern, beautiful styling with proper colors, spacing, and typography
3. Be fully interactive with working buttons, forms, and navigation
4. Implement the key features from the vision document
5. Use modern CSS (flexbox/grid) and vanilla JavaScript
6. Include realistic placeholder content
7. Be responsive and professional

IMPORTANT: Your ENTIRE response must be ONLY the HTML code, nothing else. No explanations, no markdown, just pure HTML starting with <!DOCTYPE html>.

Create a visually stunning, fully functional prototype that brings the vision to life."""
            }
        }
    
    async def run_agent(self, agent_role: str, context: str, project_id: str) -> tuple[str, str]:
        """Run a specific agent and return its response"""
        agent_info = self.agents[agent_role]
        session_id = f"{project_id}_{agent_role}"
        
        # Create LLM chat instance
        chat = LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message=agent_info["system_prompt"]
        ).with_model("gemini", "gemini-2.5-pro")
        
        # Send message
        user_message = UserMessage(text=context)
        response = await chat.send_message(user_message)
        
        return agent_info["name"], response
    
    async def process_workflow(self, project_id: str, initial_brief: str, websocket: WebSocket):
        """Process the entire multi-agent workflow"""
        try:
            # Stage 1: Project Manager
            await self.send_status(websocket, "pm", "in_progress")
            pm_name, pm_response = await self.run_agent("pm", f"Project Brief: {initial_brief}", project_id)
            await self.send_message(websocket, project_id, "pm", pm_name, pm_response)
            await self.send_status(websocket, "pm", "completed")
            await self.send_handoff(websocket, "pm", "ba")
            
            # Stage 2: Business Analyst
            await self.send_status(websocket, "ba", "in_progress")
            ba_context = f"Project Brief: {initial_brief}\n\nProject Manager's Plan:\n{pm_response}"
            ba_name, ba_response = await self.run_agent("ba", ba_context, project_id)
            await self.send_message(websocket, project_id, "ba", ba_name, ba_response)
            
            # Save Vision Document
            await self.save_artifact(project_id, "vision", ba_response)
            await self.send_artifact(websocket, project_id, "vision", ba_response)
            await self.send_status(websocket, "ba", "completed")
            await self.send_handoff(websocket, "ba", "ux")
            
            # Stage 3: UX Designer
            await self.send_status(websocket, "ux", "in_progress")
            ux_context = f"Project Brief: {initial_brief}\n\nVision Document:\n{ba_response}"
            ux_name, ux_response = await self.run_agent("ux", ux_context, project_id)
            await self.send_message(websocket, project_id, "ux", ux_name, ux_response)
            
            # Save Use Cases
            await self.save_artifact(project_id, "usecases", ux_response)
            await self.send_artifact(websocket, project_id, "usecases", ux_response)
            await self.send_status(websocket, "ux", "completed")
            await self.send_handoff(websocket, "ux", "ui")
            
            # Stage 4: UI Engineer
            await self.send_status(websocket, "ui", "in_progress")
            ui_context = f"""Project Brief: {initial_brief}

Vision Document:
{ba_response}

Use Cases:
{ux_response}

Create a complete HTML prototype based on all of the above."""
            ui_name, ui_response = await self.run_agent("ui", ui_context, project_id)
            
            # Clean HTML response (remove any markdown formatting)
            html_content = ui_response.strip()
            if html_content.startswith("```html"):
                html_content = html_content[7:]
            if html_content.startswith("```"):
                html_content = html_content[3:]
            if html_content.endswith("```"):
                html_content = html_content[:-3]
            html_content = html_content.strip()
            
            # Save Prototype
            await self.save_artifact(project_id, "prototype", html_content)
            await self.send_artifact(websocket, project_id, "prototype", html_content)
            await self.send_message(websocket, project_id, "ui", ui_name, "Prototype created successfully!")
            await self.send_status(websocket, "ui", "completed")
            
            # Workflow complete
            await websocket.send_json({
                "type": "workflow_complete",
                "project_id": project_id
            })
            
        except Exception as e:
            logger.error(f"Error in workflow: {str(e)}")
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
    
    async def send_status(self, websocket: WebSocket, agent_role: str, status: str):
        await websocket.send_json({
            "type": "agent_status",
            "agent_role": agent_role,
            "status": status
        })
    
    async def send_message(self, websocket: WebSocket, project_id: str, agent_role: str, agent_name: str, message: str):
        # Save to database
        msg_doc = {
            "id": str(uuid.uuid4()),
            "project_id": project_id,
            "agent_role": agent_role,
            "agent_name": agent_name,
            "message": message,
            "message_type": "text",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.agent_messages.insert_one(msg_doc)
        
        # Send via websocket
        await websocket.send_json({
            "type": "agent_message",
            "agent_role": agent_role,
            "agent_name": agent_name,
            "message": message
        })
    
    async def send_handoff(self, websocket: WebSocket, from_agent: str, to_agent: str):
        await websocket.send_json({
            "type": "handoff",
            "from_agent": from_agent,
            "to_agent": to_agent
        })
    
    async def send_artifact(self, websocket: WebSocket, project_id: str, artifact_type: str, content: str):
        await websocket.send_json({
            "type": "artifact_ready",
            "project_id": project_id,
            "artifact_type": artifact_type,
            "content": content
        })
    
    async def save_artifact(self, project_id: str, artifact_type: str, content: str):
        artifact_doc = {
            "id": str(uuid.uuid4()),
            "project_id": project_id,
            "artifact_type": artifact_type,
            "content": content,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.artifacts.insert_one(artifact_doc)

# Global orchestrator instance
orchestrator = AgentOrchestrator(EMERGENT_LLM_KEY)

# ==================== API ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "AICOE Genesis API", "status": "active"}

@api_router.post("/projects", response_model=Project)
async def create_project(input: ProjectCreate):
    """Create a new project"""
    project = Project(
        name=input.name,
        description=input.description,
        mode=input.mode
    )
    doc = project.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.projects.insert_one(doc)
    return project

@api_router.get("/projects", response_model=List[Project])
async def get_projects():
    """Get all projects"""
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    for proj in projects:
        if isinstance(proj['created_at'], str):
            proj['created_at'] = datetime.fromisoformat(proj['created_at'])
        if isinstance(proj['updated_at'], str):
            proj['updated_at'] = datetime.fromisoformat(proj['updated_at'])
    return projects

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get a specific project"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if isinstance(project['created_at'], str):
        project['created_at'] = datetime.fromisoformat(project['created_at'])
    if isinstance(project['updated_at'], str):
        project['updated_at'] = datetime.fromisoformat(project['updated_at'])
    return project

@api_router.get("/projects/{project_id}/artifacts", response_model=List[Artifact])
async def get_project_artifacts(project_id: str):
    """Get all artifacts for a project"""
    artifacts = await db.artifacts.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    for art in artifacts:
        if isinstance(art['created_at'], str):
            art['created_at'] = datetime.fromisoformat(art['created_at'])
    return artifacts

@api_router.get("/projects/{project_id}/messages", response_model=List[AgentMessage])
async def get_project_messages(project_id: str):
    """Get all agent messages for a project"""
    messages = await db.agent_messages.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    for msg in messages:
        if isinstance(msg.get('timestamp'), str):
            msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
    return messages

# ==================== WEBSOCKET ====================

@api_router.websocket("/ws/workflow/{project_id}")
async def workflow_websocket(websocket: WebSocket, project_id: str):
    """WebSocket endpoint for real-time workflow updates"""
    await websocket.accept()
    logger.info(f"WebSocket connected for project {project_id}")
    
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            
            if action == "start_workflow":
                brief = data.get("brief")
                if not brief:
                    await websocket.send_json({"type": "error", "message": "Brief is required"})
                    continue
                
                # Process workflow in background
                await orchestrator.process_workflow(project_id, brief, websocket)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for project {project_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass

# ==================== VOICE MODE (Simplified) ====================
# Voice mode will use client-side Web Audio + Google Gemini Live API directly from frontend
# Backend just provides function calling support

@api_router.post("/voice/generate-artifact")
async def generate_artifact(data: dict):
    """Generate artifact based on voice conversation context"""
    artifact_type = data.get("artifact_type")
    context = data.get("context")
    project_id = data.get("project_id")
    
    if not all([artifact_type, context, project_id]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Use appropriate agent to generate artifact
    agent_map = {
        "vision": "ba",
        "usecases": "ux",
        "prototype": "ui"
    }
    
    agent_role = agent_map.get(artifact_type)
    if not agent_role:
        raise HTTPException(status_code=400, detail="Invalid artifact type")
    
    # Generate content
    _, content = await orchestrator.run_agent(agent_role, context, project_id)
    
    # Clean HTML if prototype
    if artifact_type == "prototype":
        if content.startswith("```html"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
    
    # Save artifact
    await orchestrator.save_artifact(project_id, artifact_type, content)
    
    return {
        "success": True,
        "artifact_type": artifact_type,
        "content": content
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
