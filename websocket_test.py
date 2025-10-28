#!/usr/bin/env python3
"""
WebSocket Workflow Test - Focused test for text mode workflow
"""

import asyncio
import json
import websockets
import time
from datetime import datetime

async def test_websocket_workflow():
    """Test WebSocket workflow with extended timeout"""
    
    # Use the project ID from previous test
    project_id = "33d16279-54cd-4460-8c90-e21748716473"
    ws_url = "wss://designgenesis-ai.preview.emergentagent.com/api/ws/workflow/" + project_id
    
    print(f"🔗 Connecting to: {ws_url}")
    
    try:
        async with websockets.connect(ws_url) as websocket:
            # Send workflow start message
            start_message = {
                "action": "start_workflow",
                "brief": "Create a simple todo list app with add, edit, delete, and mark complete functionality"
            }
            
            await websocket.send(json.dumps(start_message))
            print(f"📤 Sent workflow start message at {datetime.now()}")
            
            # Collect messages for up to 5 minutes
            messages_received = []
            workflow_complete = False
            start_time = time.time()
            timeout = 300  # 5 minutes
            
            while time.time() - start_time < timeout and not workflow_complete:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=30)
                    data = json.loads(message)
                    messages_received.append(data)
                    
                    msg_type = data.get('type')
                    elapsed = int(time.time() - start_time)
                    
                    if msg_type == 'agent_status':
                        agent = data.get('agent_role')
                        status = data.get('status')
                        print(f"    📊 [{elapsed}s] Agent {agent}: {status}")
                    elif msg_type == 'agent_message':
                        agent = data.get('agent_role')
                        print(f"    💬 [{elapsed}s] Message from {agent}")
                    elif msg_type == 'artifact_ready':
                        artifact_type = data.get('artifact_type')
                        content_len = len(data.get('content', ''))
                        print(f"    📄 [{elapsed}s] Artifact ready: {artifact_type} ({content_len} chars)")
                    elif msg_type == 'handoff':
                        from_agent = data.get('from_agent')
                        to_agent = data.get('to_agent')
                        print(f"    🔄 [{elapsed}s] Handoff: {from_agent} → {to_agent}")
                    elif msg_type == 'workflow_complete':
                        print(f"    ✅ [{elapsed}s] Workflow completed!")
                        workflow_complete = True
                        break
                    elif msg_type == 'error':
                        print(f"    ❌ [{elapsed}s] Error: {data.get('message', 'Unknown error')}")
                        return False
                        
                except asyncio.TimeoutError:
                    elapsed = int(time.time() - start_time)
                    print(f"    ⏱️  [{elapsed}s] Waiting for more messages...")
                    continue
                except Exception as e:
                    print(f"    🚨 Message processing error: {str(e)}")
                    return False
            
            # Analyze results
            if workflow_complete:
                agent_messages = [m for m in messages_received if m.get('type') == 'agent_message']
                artifacts = [m for m in messages_received if m.get('type') == 'artifact_ready']
                
                print(f"\n✅ SUCCESS: Workflow completed!")
                print(f"   📊 Total messages: {len(messages_received)}")
                print(f"   💬 Agent messages: {len(agent_messages)}")
                print(f"   📄 Artifacts generated: {len(artifacts)}")
                
                for artifact in artifacts:
                    artifact_type = artifact.get('artifact_type')
                    content_len = len(artifact.get('content', ''))
                    print(f"      - {artifact_type}: {content_len} characters")
                
                return True
            else:
                elapsed = int(time.time() - start_time)
                print(f"\n⏰ TIMEOUT: Workflow did not complete within {timeout}s")
                print(f"   📊 Messages received: {len(messages_received)}")
                print(f"   ⏱️  Elapsed time: {elapsed}s")
                return False
                
    except Exception as e:
        print(f"🚨 WebSocket connection failed: {str(e)}")
        return False

async def main():
    print("🚀 Starting WebSocket Workflow Test")
    print(f"⏰ Started: {datetime.now()}")
    print("=" * 60)
    
    success = await test_websocket_workflow()
    
    print("=" * 60)
    print(f"⏰ Completed: {datetime.now()}")
    print(f"📊 Result: {'SUCCESS' if success else 'FAILED'}")

if __name__ == "__main__":
    asyncio.run(main())