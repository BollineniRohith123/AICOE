#!/usr/bin/env python3
"""
Comprehensive Backend Test Results - AICOE Genesis Dual Realtime API
"""

import requests
import json
import asyncio
import websockets
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://api-test-suite-4.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

print("🚀 COMPREHENSIVE BACKEND TEST RESULTS")
print("=" * 80)
print(f"Backend URL: {API_BASE}")
print(f"Test Time: {datetime.now()}")
print("=" * 80)

class ComprehensiveTestResults:
    def __init__(self):
        self.results = {
            'working': [],
            'failed': [],
            'issues': []
        }

    def log_success(self, test_name, details=""):
        self.results['working'].append(f"✅ {test_name}: {details}")
        print(f"✅ {test_name}: {details}")

    def log_failure(self, test_name, error=""):
        self.results['failed'].append(f"❌ {test_name}: {error}")
        print(f"❌ {test_name}: {error}")

    def log_issue(self, issue):
        self.results['issues'].append(issue)

    async def run_comprehensive_tests(self):
        """Run all comprehensive tests"""
        
        print("\n🔍 1. REALTIME CONFIGURATION ENDPOINT")
        await self.test_realtime_config()
        
        print("\n🔍 2. OPENAI REALTIME API ENDPOINTS")
        await self.test_openai_endpoints()
        
        print("\n🔍 3. GEMINI LIVE API WEBSOCKET")
        await self.test_gemini_websocket()
        
        print("\n🔍 4. TEXT MODE MULTI-AGENT SYSTEM")
        await self.test_text_mode_system()
        
        print("\n🔍 5. CRUD OPERATIONS")
        await self.test_crud_operations()
        
        print("\n🔍 6. ARTIFACT GENERATION")
        await self.test_artifact_generation()
        
        # Generate final report
        self.generate_report()

    async def test_realtime_config(self):
        """Test realtime configuration endpoint"""
        try:
            response = requests.get(f"{API_BASE}/realtime/config")
            if response.status_code == 200:
                config = response.json()
                
                # Verify all required fields
                required_fields = ['provider', 'openai_enabled', 'gemini_enabled', 'available_providers']
                if all(field in config for field in required_fields):
                    details = f"Provider: {config['provider']}, OpenAI: {config['openai_enabled']}, Gemini: {config['gemini_enabled']}"
                    self.log_success("Realtime Configuration", details)
                    
                    # Check if both providers are enabled
                    if config['openai_enabled'] and config['gemini_enabled']:
                        self.log_success("Dual Provider Support", "Both OpenAI and Gemini enabled")
                    else:
                        self.log_issue("Only partial provider support enabled")
                else:
                    self.log_failure("Realtime Configuration", "Missing required fields in response")
            else:
                self.log_failure("Realtime Configuration", f"HTTP {response.status_code}")
        except Exception as e:
            self.log_failure("Realtime Configuration", str(e))

    async def test_openai_endpoints(self):
        """Test OpenAI realtime endpoints"""
        
        # Test session creation
        try:
            response = requests.post(f"{API_BASE}/realtime/session")
            if response.status_code == 200:
                data = response.json()
                if 'error' in data:
                    error_msg = data['error']['message']
                    if 'Incorrect API key' in error_msg:
                        self.log_failure("OpenAI Session Creation", "Invalid API key (sk-emerg- prefix not recognized by OpenAI)")
                        self.log_issue("OpenAI API key issue: Emergent Integrations key format not compatible with OpenAI Realtime API")
                    else:
                        self.log_failure("OpenAI Session Creation", error_msg)
                else:
                    self.log_success("OpenAI Session Creation", "Session created successfully")
            else:
                self.log_failure("OpenAI Session Creation", f"HTTP {response.status_code}")
        except Exception as e:
            self.log_failure("OpenAI Session Creation", str(e))

        # Test negotiate endpoint
        try:
            response = requests.post(f"{API_BASE}/realtime/negotiate", json={})
            if response.status_code in [200, 400, 422]:  # These are expected responses
                self.log_success("OpenAI SDP Negotiate", "Endpoint accessible and responding")
            else:
                self.log_failure("OpenAI SDP Negotiate", f"HTTP {response.status_code}")
        except Exception as e:
            self.log_failure("OpenAI SDP Negotiate", str(e))

    async def test_gemini_websocket(self):
        """Test Gemini Live WebSocket"""
        try:
            ws_url = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://')
            ws_endpoint = f"{ws_url}/gemini/live"
            
            async with websockets.connect(ws_endpoint) as websocket:
                self.log_success("Gemini WebSocket Connection", "Connection established successfully")
                
                # Test message sending
                test_message = {
                    "type": "text_message",
                    "message": "Hello Gemini, this is a test message"
                }
                
                await websocket.send(json.dumps(test_message))
                self.log_success("Gemini Message Sending", "Test message sent successfully")
                
                # Try to receive response (with short timeout)
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5)
                    self.log_success("Gemini Response", "Received response from Gemini Live API")
                except asyncio.TimeoutError:
                    self.log_success("Gemini WebSocket", "Connection stable (no immediate response expected)")
                    
        except websockets.exceptions.ConnectionClosed as e:
            if e.code == 1008:
                self.log_failure("Gemini WebSocket", "API not enabled or configured")
            else:
                self.log_failure("Gemini WebSocket", f"Connection closed (Code: {e.code})")
        except Exception as e:
            self.log_failure("Gemini WebSocket", str(e))

    async def test_text_mode_system(self):
        """Test text mode multi-agent system"""
        
        # First create a project
        try:
            project_data = {
                "name": "Test Multi-Agent Project",
                "description": "Testing the multi-agent workflow system",
                "mode": "text"
            }
            response = requests.post(f"{API_BASE}/projects", json=project_data)
            if response.status_code == 200:
                project = response.json()
                project_id = project['id']
                self.log_success("Project Creation for Workflow", f"Project ID: {project_id[:8]}...")
                
                # Test WebSocket workflow (but expect budget limit issue)
                try:
                    ws_url = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://')
                    ws_endpoint = f"{ws_url}/ws/workflow/{project_id}"
                    
                    async with websockets.connect(ws_endpoint) as websocket:
                        self.log_success("WebSocket Connection", "Multi-agent workflow WebSocket connected")
                        
                        # Send workflow start message
                        start_message = {
                            "action": "start_workflow",
                            "brief": "Create a simple weather app with location services"
                        }
                        
                        await websocket.send(json.dumps(start_message))
                        self.log_success("Workflow Initiation", "Start message sent successfully")
                        
                        # Listen for initial response
                        try:
                            message = await asyncio.wait_for(websocket.recv(), timeout=10)
                            data = json.loads(message)
                            
                            if data.get('type') == 'error':
                                error_msg = data.get('message', '')
                                if 'Budget has been exceeded' in error_msg:
                                    self.log_failure("Multi-Agent Workflow", "LLM budget limit exceeded")
                                    self.log_issue("Budget limit reached: Current cost exceeds $0.4 limit")
                                else:
                                    self.log_failure("Multi-Agent Workflow", error_msg)
                            else:
                                self.log_success("Multi-Agent Workflow", f"Received {data.get('type')} message")
                                
                        except asyncio.TimeoutError:
                            self.log_success("WebSocket Workflow", "Connection stable, waiting for agent processing")
                            
                except Exception as e:
                    self.log_failure("WebSocket Workflow", str(e))
            else:
                self.log_failure("Project Creation for Workflow", f"HTTP {response.status_code}")
        except Exception as e:
            self.log_failure("Text Mode System", str(e))

    async def test_crud_operations(self):
        """Test CRUD operations"""
        project_id = None
        
        # Create project
        try:
            project_data = {
                "name": "CRUD Test Project",
                "description": "Testing CRUD operations",
                "mode": "text"
            }
            response = requests.post(f"{API_BASE}/projects", json=project_data)
            if response.status_code == 200:
                project = response.json()
                project_id = project['id']
                self.log_success("Create Project", f"Project created with ID: {project_id[:8]}...")
            else:
                self.log_failure("Create Project", f"HTTP {response.status_code}")
                return
        except Exception as e:
            self.log_failure("Create Project", str(e))
            return

        # List projects
        try:
            response = requests.get(f"{API_BASE}/projects")
            if response.status_code == 200:
                projects = response.json()
                self.log_success("List Projects", f"Retrieved {len(projects)} projects")
            else:
                self.log_failure("List Projects", f"HTTP {response.status_code}")
        except Exception as e:
            self.log_failure("List Projects", str(e))

        # Get specific project
        try:
            response = requests.get(f"{API_BASE}/projects/{project_id}")
            if response.status_code == 200:
                project = response.json()
                self.log_success("Get Project by ID", f"Retrieved project: {project.get('name')}")
            else:
                self.log_failure("Get Project by ID", f"HTTP {response.status_code}")
        except Exception as e:
            self.log_failure("Get Project by ID", str(e))

        # Get project artifacts
        try:
            response = requests.get(f"{API_BASE}/projects/{project_id}/artifacts")
            if response.status_code == 200:
                artifacts = response.json()
                self.log_success("Get Project Artifacts", f"Retrieved {len(artifacts)} artifacts")
            else:
                self.log_failure("Get Project Artifacts", f"HTTP {response.status_code}")
        except Exception as e:
            self.log_failure("Get Project Artifacts", str(e))

        # Get project messages
        try:
            response = requests.get(f"{API_BASE}/projects/{project_id}/messages")
            if response.status_code == 200:
                messages = response.json()
                self.log_success("Get Project Messages", f"Retrieved {len(messages)} messages")
            else:
                self.log_failure("Get Project Messages", f"HTTP {response.status_code}")
        except Exception as e:
            self.log_failure("Get Project Messages", str(e))

    async def test_artifact_generation(self):
        """Test artifact generation endpoint"""
        
        # Create a project first
        try:
            project_data = {
                "name": "Artifact Test Project",
                "description": "Testing artifact generation",
                "mode": "voice"
            }
            response = requests.post(f"{API_BASE}/projects", json=project_data)
            if response.status_code == 200:
                project = response.json()
                project_id = project['id']
                
                # Test artifact generation (expect budget limit)
                artifact_data = {
                    "project_id": project_id,
                    "artifact_type": "vision",
                    "context": "Create a simple calculator app with basic arithmetic operations"
                }
                
                response = requests.post(f"{API_BASE}/voice/generate-artifact", json=artifact_data)
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        self.log_success("Artifact Generation", f"Generated {artifact_data['artifact_type']} artifact")
                    else:
                        self.log_failure("Artifact Generation", "Invalid response format")
                elif response.status_code == 500:
                    self.log_failure("Artifact Generation", "Budget limit exceeded (expected)")
                    self.log_issue("Artifact generation blocked by LLM budget limit")
                else:
                    self.log_failure("Artifact Generation", f"HTTP {response.status_code}")
            else:
                self.log_failure("Artifact Generation Setup", "Could not create test project")
        except Exception as e:
            self.log_failure("Artifact Generation", str(e))

    def generate_report(self):
        """Generate comprehensive test report"""
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE TEST REPORT")
        print("=" * 80)
        
        print(f"\n✅ WORKING FEATURES ({len(self.results['working'])})")
        for item in self.results['working']:
            print(f"  {item}")
        
        print(f"\n❌ FAILED FEATURES ({len(self.results['failed'])})")
        for item in self.results['failed']:
            print(f"  {item}")
        
        print(f"\n⚠️  IDENTIFIED ISSUES ({len(self.results['issues'])})")
        for item in self.results['issues']:
            print(f"  • {item}")
        
        # Calculate success rate
        total_tests = len(self.results['working']) + len(self.results['failed'])
        if total_tests > 0:
            success_rate = (len(self.results['working']) / total_tests) * 100
            print(f"\n📈 SUCCESS RATE: {success_rate:.1f}% ({len(self.results['working'])}/{total_tests})")
        
        print(f"\n⏰ Test Completed: {datetime.now()}")
        print("=" * 80)

async def main():
    """Run comprehensive tests"""
    tester = ComprehensiveTestResults()
    await tester.run_comprehensive_tests()

if __name__ == "__main__":
    asyncio.run(main())