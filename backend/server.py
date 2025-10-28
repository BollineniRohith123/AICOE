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
from emergentintegrations.llm.openai import OpenAIChatRealtime

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
    mode: str
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Artifact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    artifact_type: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AgentMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    agent_role: str
    message: str
    message_type: str = "text"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectCreate(BaseModel):
    name: str
    description: str
    mode: str = "text"

# ==================== ENHANCED AGENT SYSTEM ====================

class EnhancedAgentOrchestrator:
    """Enhanced multi-agent orchestrator with better prompts and React generation"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.agents = {
            "pm": {
                "name": "Alex (Project Manager)",
                "system_prompt": """You are Alex, a visionary Project Manager with 15+ years in software design.

Your approach:
1. Deeply analyze the project brief to understand user needs and business goals
2. Identify key success metrics and technical requirements
3. Create a clear, actionable plan with defined phases
4. Set realistic expectations and timelines
5. Highlight potential challenges and mitigation strategies

Your response should be structured, professional, and inspire confidence.
End by confirming handoff to the Business Analyst."""
            },
            "ba": {
                "name": "Brenda (Business Analyst)",
                "system_prompt": """You are Brenda, a senior Business Analyst specializing in product strategy.

Create a comprehensive Vision Document with this EXACT structure:

# Vision Document

## Executive Summary
[Compelling 3-paragraph summary of the product vision, target market, and value proposition]

## Problem Statement
[Clear articulation of the problem being solved, including pain points and market gaps]

## Target Audience
### Primary Users
[Detailed persona including demographics, behaviors, needs]
### Secondary Users  
[Additional user groups]

## Goals and Objectives
1. [Primary business goal]
2. [User experience goal]
3. [Technical goal]
4. [Growth/scaling goal]
5. [Innovation goal]

## Key Features
### Core Features
1. **[Feature Name]**: [Detailed description with user benefit]
2. **[Feature Name]**: [Detailed description with user benefit]
[Continue for 5-7 core features]

### Future Features
[2-3 potential future additions]

## Success Metrics
- [Measurable metric 1]
- [Measurable metric 2]
- [Measurable metric 3]

## Technical Considerations
[Key technical requirements, platforms, integrations]

## Constraints and Assumptions
### Constraints
- [Technical/business/time constraints]
### Assumptions
- [Key assumptions about users, market, technology]

## Competitive Advantage
[What makes this unique]

Be thorough, specific, and business-focused. End by confirming handoff to UX Designer."""
            },
            "ux": {
                "name": "Carlos (UX Designer)",
                "system_prompt": """You are Carlos, an expert UX Designer with deep expertise in user-centered design.

Create comprehensive Use Cases with this EXACT structure:

# User Stories and Use Cases

## User Personas
### Persona 1: [Name]
- **Demographics**: [Age, location, occupation]
- **Goals**: [What they want to achieve]
- **Pain Points**: [Current frustrations]
- **Tech Savviness**: [Level of technical expertise]

### Persona 2: [Name]
[Same structure]

## User Stories
[Write 10-12 detailed user stories in format: "As a [persona], I want to [action] so that [benefit]"]

## Detailed Use Cases

### Use Case 1: [Name]
- **ID**: UC-001
- **Actor**: [Primary user type]
- **Goal**: [What user wants to accomplish]
- **Preconditions**: [What must be true before this use case]
- **Main Flow**:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
  [Continue for all steps]
- **Alternative Flows**:
  - **Alt 1**: [Alternative path]
  - **Alt 2**: [Error handling]
- **Postconditions**: [System state after completion]
- **Business Rules**: [Any rules that apply]

[Create 5-7 detailed use cases covering all major features]

## User Journey Maps
### Journey 1: [Scenario Name]
**Stages**: [Awareness → Consideration → Usage → Retention]
[Detailed description of user journey]

## Interaction Patterns
[Key UI/UX patterns to be used]

## Accessibility Considerations
[How to ensure accessible design]

Be detailed, user-focused, and practical. End by confirming handoff to UI Engineer."""
            },
            "ui": {
                "name": "Diana (UI Engineer)",
                "system_prompt": """You are Diana, a senior UI Engineer specializing in modern React development.

Your task: Create a COMPLETE, PRODUCTION-READY React application based on the vision and use cases.

REQUIREMENTS:
1. Generate a SINGLE, COMPLETE React component file
2. Use modern React 19 with hooks (useState, useEffect)
3. Include beautiful, modern styling using Tailwind CSS classes
4. Implement ALL core features from the vision document
5. Create interactive, working functionality
6. Use proper component structure with clean code
7. Include realistic sample data
8. Add smooth animations and transitions
9. Make it fully responsive
10. Use modern UI patterns (cards, modals, dropdowns, etc.)

STRUCTURE YOUR RESPONSE:
```javascript
import React, { useState, useEffect } from 'react';

const App = () => {
  // State management
  const [state, setState] = useState(initialState);
  
  // Core functionality
  const handleAction = () => {
    // Implementation
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Your beautiful, functional UI */}
    </div>
  );
};

export default App;
```

KEY POINTS:
- Use semantic HTML and ARIA labels for accessibility
- Implement proper error states and loading indicators
- Include hover effects and smooth transitions
- Use modern color schemes (avoid basic colors)
- Add icons using Unicode or emoji (no external icon libraries)
- Create a cohesive, professional design
- Make it production-ready

IMPORTANT: Your ENTIRE response must be ONLY the JavaScript/React code. No markdown, no explanations, just the code starting with "import React".

Create a visually stunning, fully functional React application."""
            }
        }
    
    async def run_agent(self, agent_role: str, context: str, project_id: str) -> tuple[str, str]:
        """Run a specific agent and return its response"""
        agent_info = self.agents[agent_role]
        session_id = f"{project_id}_{agent_role}_{uuid.uuid4().hex[:8]}"
        
        chat = LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message=agent_info["system_prompt"]
        ).with_model("gemini", "gemini-2.5-pro")
        
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
            await self.save_artifact(project_id, "vision", ba_response)
            await self.send_artifact(websocket, project_id, "vision", ba_response)
            await self.send_status(websocket, "ba", "completed")
            await self.send_handoff(websocket, "ba", "ux")
            
            # Stage 3: UX Designer
            await self.send_status(websocket, "ux", "in_progress")
            ux_context = f"Project Brief: {initial_brief}\n\nVision Document:\n{ba_response}"
            ux_name, ux_response = await self.run_agent("ux", ux_context, project_id)
            await self.send_message(websocket, project_id, "ux", ux_name, ux_response)
            await self.save_artifact(project_id, "usecases", ux_response)
            await self.send_artifact(websocket, project_id, "usecases", ux_response)
            await self.send_status(websocket, "ux", "completed")
            await self.send_handoff(websocket, "ux", "ui")
            
            # Stage 4: UI Engineer - React Component
            await self.send_status(websocket, "ui", "in_progress")
            ui_context = f"""Project Brief: {initial_brief}

Vision Document:
{ba_response}

Use Cases:
{ux_response}

Create a complete React application based on all of the above. Remember: ONLY output the React code, nothing else."""
            ui_name, ui_response = await self.run_agent("ui", ui_context, project_id)
            
            # Clean React code
            react_code = ui_response.strip()
            if react_code.startswith("```javascript") or react_code.startswith("```jsx"):
                react_code = react_code.split("\n", 1)[1]
            if react_code.startswith("```"):
                react_code = react_code.split("\n", 1)[1]
            if react_code.endswith("```"):
                react_code = react_code.rsplit("\n", 1)[0]
            react_code = react_code.strip()
            
            await self.save_artifact(project_id, "prototype", react_code)
            await self.send_artifact(websocket, project_id, "prototype", react_code)
            await self.send_message(websocket, project_id, "ui", ui_name, "React prototype created successfully!")
            await self.send_status(websocket, "ui", "completed")
            
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

orchestrator = EnhancedAgentOrchestrator(EMERGENT_LLM_KEY)

# ==================== REALTIME VOICE API ====================

# Initialize OpenAI Realtime for voice
realtime_chat = OpenAIChatRealtime(api_key=EMERGENT_LLM_KEY)

# Create realtime router
realtime_router = APIRouter(prefix="/realtime")
OpenAIChatRealtime.register_openai_realtime_router(realtime_router, realtime_chat)

# ==================== API ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "AICOE Genesis API - Enhanced with ADK principles", "status": "active"}

@api_router.post("/projects", response_model=Project)
async def create_project(input: ProjectCreate):
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
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    for proj in projects:
        if isinstance(proj['created_at'], str):
            proj['created_at'] = datetime.fromisoformat(proj['created_at'])
        if isinstance(proj['updated_at'], str):
            proj['updated_at'] = datetime.fromisoformat(proj['updated_at'])
    return projects

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
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
    artifacts = await db.artifacts.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    for art in artifacts:
        if isinstance(art['created_at'], str):
            art['created_at'] = datetime.fromisoformat(art['created_at'])
    return artifacts

@api_router.get("/projects/{project_id}/messages", response_model=List[AgentMessage])
async def get_project_messages(project_id: str):
    messages = await db.agent_messages.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    for msg in messages:
        if isinstance(msg.get('timestamp'), str):
            msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
    return messages

@api_router.websocket("/ws/workflow/{project_id}")
async def workflow_websocket(websocket: WebSocket, project_id: str):
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
                
                await orchestrator.process_workflow(project_id, brief, websocket)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for project {project_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass

@api_router.post("/voice/generate-artifact")
async def generate_artifact(data: dict):
    artifact_type = data.get("artifact_type")
    context = data.get("context")
    project_id = data.get("project_id")
    
    if not all([artifact_type, context, project_id]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    agent_map = {"vision": "ba", "usecases": "ux", "prototype": "ui"}
    agent_role = agent_map.get(artifact_type)
    if not agent_role:
        raise HTTPException(status_code=400, detail="Invalid artifact type")
    
    _, content = await orchestrator.run_agent(agent_role, context, project_id)
    
    if artifact_type == "prototype":
        if content.startswith("```"):
            content = content.split("\n", 1)[1]
        if content.endswith("```"):
            content = content.rsplit("\n", 1)[0]
        content = content.strip()
    
    await orchestrator.save_artifact(project_id, artifact_type, content)
    
    return {"success": True, "artifact_type": artifact_type, "content": content}

app.include_router(api_router)
api_router.include_router(realtime_router)

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
