#!/usr/bin/env python3
"""
Focused Backend Testing - Key Endpoints Only
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
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://gemini-fixer.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

print(f"🔧 Testing Backend URL: {API_BASE}")
print(f"⏰ Test Started: {datetime.now()}")
print("=" * 80)

def test_realtime_config():
    """Test Realtime Configuration"""
    print("🔍 Testing Realtime Configuration")
    try:
        response = requests.get(f"{API_BASE}/realtime/config")
        if response.status_code == 200:
            config = response.json()
            print(f"✅ Configuration retrieved successfully")
            print(f"   Provider: {config.get('provider')}")
            print(f"   OpenAI Enabled: {config.get('openai_enabled')}")
            print(f"   Gemini Enabled: {config.get('gemini_enabled')}")
            return True
        else:
            print(f"❌ HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_openai_endpoints():
    """Test OpenAI Endpoints"""
    print("\n🔍 Testing OpenAI Endpoints")
    
    # Test session creation
    try:
        response = requests.post(f"{API_BASE}/realtime/session")
        if response.status_code == 200:
            data = response.json()
            if 'error' in data:
                print(f"❌ OpenAI Session: API Key Error - {data['error']['message']}")
                return False
            else:
                print(f"✅ OpenAI Session: Created successfully")
                return True
        else:
            print(f"❌ OpenAI Session: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ OpenAI Session Error: {str(e)}")
        return False

async def test_gemini_websocket():
    """Test Gemini WebSocket"""
    print("\n🔍 Testing Gemini WebSocket")
    
    try:
        ws_url = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://')
        ws_endpoint = f"{ws_url}/gemini/live"
        
        async with websockets.connect(ws_endpoint) as websocket:
            print("✅ Gemini WebSocket: Connection established")
            
            # Send test message
            test_msg = {"type": "text_message", "message": "Hello Gemini"}
            await websocket.send(json.dumps(test_msg))
            print("✅ Gemini WebSocket: Message sent successfully")
            
            return True
            
    except websockets.exceptions.ConnectionClosed as e:
        if e.code == 1008:
            print(f"❌ Gemini WebSocket: API not enabled (Code: {e.code})")
        else:
            print(f"❌ Gemini WebSocket: Connection closed (Code: {e.code})")
        return False
    except Exception as e:
        print(f"❌ Gemini WebSocket Error: {str(e)}")
        return False

def test_basic_crud():
    """Test Basic CRUD"""
    print("\n🔍 Testing Basic CRUD")
    
    try:
        # Create project
        project_data = {
            "name": "Test Project",
            "description": "Simple test project",
            "mode": "text"
        }
        response = requests.post(f"{API_BASE}/projects", json=project_data)
        if response.status_code == 200:
            project = response.json()
            project_id = project['id']
            print(f"✅ CRUD: Project created (ID: {project_id[:8]}...)")
            
            # Get project
            response = requests.get(f"{API_BASE}/projects/{project_id}")
            if response.status_code == 200:
                print(f"✅ CRUD: Project retrieved successfully")
                return True
            else:
                print(f"❌ CRUD: Failed to retrieve project")
                return False
        else:
            print(f"❌ CRUD: Failed to create project")
            return False
    except Exception as e:
        print(f"❌ CRUD Error: {str(e)}")
        return False

async def main():
    """Run focused tests"""
    print("🚀 FOCUSED BACKEND TESTING - DUAL REALTIME API")
    print("=" * 80)
    
    results = []
    
    # Test configuration
    results.append(test_realtime_config())
    
    # Test OpenAI endpoints
    results.append(test_openai_endpoints())
    
    # Test Gemini WebSocket
    results.append(await test_gemini_websocket())
    
    # Test basic CRUD
    results.append(test_basic_crud())
    
    # Summary
    passed = sum(results)
    total = len(results)
    
    print("\n" + "=" * 80)
    print("📊 FOCUSED TEST SUMMARY")
    print(f"✅ Passed: {passed}/{total}")
    print(f"📈 Success Rate: {(passed/total*100):.1f}%")
    print(f"⏰ Test Completed: {datetime.now()}")

if __name__ == "__main__":
    asyncio.run(main())