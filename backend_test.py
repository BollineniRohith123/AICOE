#!/usr/bin/env python3
"""
AICOE Genesis Backend Testing Suite
Comprehensive testing for all backend APIs and functionality
"""

import asyncio
import json
import requests
import websockets
import time
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://api-test-suite-4.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

print(f"🔧 Testing Backend URL: {API_BASE}")
print(f"⏰ Test Started: {datetime.now()}")
print("=" * 80)

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_project_id = None
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }

    def log_result(self, test_name, success, message="", error_details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if message:
            print(f"    📝 {message}")
        if error_details:
            print(f"    🚨 Error: {error_details}")
            self.results['errors'].append(f"{test_name}: {error_details}")
        
        if success:
            self.results['passed'] += 1
        else:
            self.results['failed'] += 1
        print()

    def test_health_check(self):
        """Test 1: Basic API Health Check"""
        print("🔍 Test 1: API Health Check")
        try:
            response = self.session.get(f"{API_BASE}/")
            if response.status_code == 200:
                data = response.json()
                if 'message' in data and 'status' in data:
                    self.log_result("Health Check", True, f"Status: {data.get('status')}, Message: {data.get('message')}")
                    return True
                else:
                    self.log_result("Health Check", False, "Missing required fields in response", str(data))
            else:
                self.log_result("Health Check", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Health Check", False, "Connection failed", str(e))
        return False

    def test_project_management(self):
        """Test 2: Project Management APIs"""
        print("🔍 Test 2: Project Management")
        
        # Test 2a: Create Project
        try:
            project_data = {
                "name": "AICOE Test Project",
                "description": "A comprehensive test project for AICOE Genesis platform",
                "mode": "text"
            }
            response = self.session.post(f"{API_BASE}/projects", json=project_data)
            
            if response.status_code == 200:
                project = response.json()
                if 'id' in project and 'name' in project:
                    self.test_project_id = project['id']
                    self.log_result("Create Project", True, f"Project ID: {self.test_project_id}")
                else:
                    self.log_result("Create Project", False, "Missing required fields", str(project))
                    return False
            else:
                self.log_result("Create Project", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Create Project", False, "Request failed", str(e))
            return False

        # Test 2b: List Projects
        try:
            response = self.session.get(f"{API_BASE}/projects")
            if response.status_code == 200:
                projects = response.json()
                if isinstance(projects, list) and len(projects) > 0:
                    self.log_result("List Projects", True, f"Found {len(projects)} projects")
                else:
                    self.log_result("List Projects", False, "No projects returned or invalid format", str(projects))
            else:
                self.log_result("List Projects", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("List Projects", False, "Request failed", str(e))

        # Test 2c: Get Specific Project
        if self.test_project_id:
            try:
                response = self.session.get(f"{API_BASE}/projects/{self.test_project_id}")
                if response.status_code == 200:
                    project = response.json()
                    if project.get('id') == self.test_project_id:
                        self.log_result("Get Project by ID", True, f"Retrieved project: {project.get('name')}")
                    else:
                        self.log_result("Get Project by ID", False, "Project ID mismatch", str(project))
                else:
                    self.log_result("Get Project by ID", False, f"HTTP {response.status_code}", response.text)
            except Exception as e:
                self.log_result("Get Project by ID", False, "Request failed", str(e))

        return True

    def test_realtime_config(self):
        """Test 3: Realtime Configuration Endpoint"""
        print("🔍 Test 3: Realtime Configuration")
        
        try:
            response = self.session.get(f"{API_BASE}/realtime/config")
            if response.status_code == 200:
                config = response.json()
                required_fields = ['provider', 'openai_enabled', 'gemini_enabled', 'available_providers']
                
                if all(field in config for field in required_fields):
                    openai_status = "✅" if config['openai_enabled'] else "❌"
                    gemini_status = "✅" if config['gemini_enabled'] else "❌"
                    
                    self.log_result("Realtime Configuration", True, 
                                  f"Provider: {config['provider']}, OpenAI: {openai_status}, Gemini: {gemini_status}")
                    return config
                else:
                    self.log_result("Realtime Configuration", False, "Missing required fields", str(config))
            else:
                self.log_result("Realtime Configuration", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Realtime Configuration", False, "Request failed", str(e))
        return None

    def test_openai_realtime_endpoints(self):
        """Test 4: OpenAI Realtime Voice API Endpoints"""
        print("🔍 Test 4: OpenAI Realtime API")
        
        # Test 4a: Create Realtime Session
        try:
            response = self.session.post(f"{API_BASE}/realtime/session")
            if response.status_code == 200:
                session_data = response.json()
                if 'client_secret' in session_data:
                    self.log_result("OpenAI Session Creation", True, "Session token received")
                else:
                    self.log_result("OpenAI Session Creation", False, "No client_secret in response", str(session_data))
            else:
                self.log_result("OpenAI Session Creation", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("OpenAI Session Creation", False, "Request failed", str(e))

        # Test 4b: SDP Negotiation Endpoint
        try:
            # This endpoint expects SDP offer, so we'll just check if it responds properly to empty request
            response = self.session.post(f"{API_BASE}/realtime/negotiate", json={})
            # We expect this to fail with 400 or similar, but not 404
            if response.status_code in [400, 422]:  # Bad request is expected without proper SDP
                self.log_result("OpenAI SDP Negotiate", True, f"Endpoint accessible (HTTP {response.status_code})")
            elif response.status_code == 404:
                self.log_result("OpenAI SDP Negotiate", False, "Endpoint not found", response.text)
            else:
                self.log_result("OpenAI SDP Negotiate", True, f"Endpoint responds (HTTP {response.status_code})")
        except Exception as e:
            self.log_result("OpenAI SDP Negotiate", False, "Request failed", str(e))

    async def test_gemini_websocket(self):
        """Test 5: Google Gemini Live API WebSocket"""
        print("🔍 Test 5: Gemini Live WebSocket")
        
        try:
            # Convert HTTP URL to WebSocket URL
            ws_url = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://')
            ws_endpoint = f"{ws_url}/gemini/live"
            
            print(f"    🔗 Connecting to: {ws_endpoint}")
            
            # Test WebSocket connection
            async with websockets.connect(ws_endpoint) as websocket:
                print("    ✅ WebSocket connection established")
                
                # Send a test text message
                test_message = {
                    "type": "text_message",
                    "message": "Hello, this is a test message for Gemini Live API"
                }
                
                await websocket.send(json.dumps(test_message))
                print("    📤 Sent test message")
                
                # Wait for response (with timeout)
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=10)
                    data = json.loads(response)
                    print(f"    📨 Received response type: {data.get('type', 'unknown')}")
                    
                    self.log_result("Gemini WebSocket Connection", True, "Connection and message exchange successful")
                    
                except asyncio.TimeoutError:
                    self.log_result("Gemini WebSocket Connection", True, "Connection successful (no immediate response)")
                    
        except websockets.exceptions.ConnectionClosed as e:
            if e.code == 1008:  # Policy violation - API not enabled
                self.log_result("Gemini WebSocket Connection", False, "Gemini Live API not enabled", f"Code: {e.code}")
            else:
                self.log_result("Gemini WebSocket Connection", False, "Connection closed", f"Code: {e.code}, Reason: {e.reason}")
        except Exception as e:
            self.log_result("Gemini WebSocket Connection", False, "Connection failed", str(e))

    def test_artifact_generation(self):
        """Test 4: Artifact Generation (Voice Mode)"""
        print("🔍 Test 4: Artifact Generation")
        
        if not self.test_project_id:
            self.log_result("Artifact Generation", False, "No test project available", "Create project first")
            return

        try:
            artifact_data = {
                "project_id": self.test_project_id,
                "artifact_type": "vision",
                "context": "I want to build a modern task management application with real-time collaboration features"
            }
            
            response = self.session.post(f"{API_BASE}/voice/generate-artifact", json=artifact_data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success') and 'content' in result:
                    content_length = len(result['content'])
                    self.log_result("Artifact Generation", True, f"Vision document generated ({content_length} chars)")
                else:
                    self.log_result("Artifact Generation", False, "Invalid response format", str(result))
            else:
                self.log_result("Artifact Generation", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Artifact Generation", False, "Request failed", str(e))

    async def test_websocket_workflow(self):
        """Test 5: WebSocket Text Mode Workflow"""
        print("🔍 Test 5: WebSocket Workflow (Text Mode)")
        
        if not self.test_project_id:
            self.log_result("WebSocket Workflow", False, "No test project available", "Create project first")
            return

        try:
            # Convert HTTP URL to WebSocket URL
            ws_url = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://')
            ws_endpoint = f"{ws_url}/ws/workflow/{self.test_project_id}"
            
            print(f"    🔗 Connecting to: {ws_endpoint}")
            
            async with websockets.connect(ws_endpoint) as websocket:
                # Send workflow start message
                start_message = {
                    "action": "start_workflow",
                    "brief": "Create a simple note-taking application with categories and search functionality"
                }
                
                await websocket.send(json.dumps(start_message))
                print("    📤 Sent workflow start message")
                
                # Collect messages for up to 2 minutes
                messages_received = []
                workflow_complete = False
                start_time = time.time()
                timeout = 120  # 2 minutes
                
                while time.time() - start_time < timeout and not workflow_complete:
                    try:
                        message = await asyncio.wait_for(websocket.recv(), timeout=10)
                        data = json.loads(message)
                        messages_received.append(data)
                        
                        msg_type = data.get('type')
                        print(f"    📨 Received: {msg_type}")
                        
                        if msg_type == 'workflow_complete':
                            workflow_complete = True
                            break
                        elif msg_type == 'error':
                            self.log_result("WebSocket Workflow", False, "Workflow error", data.get('message', 'Unknown error'))
                            return
                            
                    except asyncio.TimeoutError:
                        print("    ⏱️  Waiting for more messages...")
                        continue
                    except Exception as e:
                        self.log_result("WebSocket Workflow", False, "Message processing error", str(e))
                        return
                
                # Analyze results
                if workflow_complete:
                    agent_messages = [m for m in messages_received if m.get('type') == 'agent_message']
                    artifacts = [m for m in messages_received if m.get('type') == 'artifact_ready']
                    
                    self.log_result("WebSocket Workflow", True, 
                                  f"Workflow completed! {len(agent_messages)} messages, {len(artifacts)} artifacts")
                else:
                    self.log_result("WebSocket Workflow", False, 
                                  f"Workflow timeout after {timeout}s", f"Received {len(messages_received)} messages")
                    
        except Exception as e:
            self.log_result("WebSocket Workflow", False, "WebSocket connection failed", str(e))

    async def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting AICOE Genesis Backend Tests")
        print("=" * 80)
        
        # Run synchronous tests
        self.test_health_check()
        self.test_project_management()
        self.test_realtime_endpoints()
        self.test_artifact_generation()
        
        # Run async WebSocket test
        await self.test_websocket_workflow()
        
        # Print summary
        print("=" * 80)
        print("📊 TEST SUMMARY")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📈 Success Rate: {(self.results['passed']/(self.results['passed']+self.results['failed'])*100):.1f}%")
        
        if self.results['errors']:
            print("\n🚨 ERRORS FOUND:")
            for error in self.results['errors']:
                print(f"  • {error}")
        
        print(f"\n⏰ Test Completed: {datetime.now()}")
        return self.results

async def main():
    """Main test runner"""
    tester = BackendTester()
    results = await tester.run_all_tests()
    return results

if __name__ == "__main__":
    asyncio.run(main())