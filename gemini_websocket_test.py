#!/usr/bin/env python3
"""
Simple Gemini WebSocket Test
"""

import asyncio
import json
import websockets
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://voice-text-analyzer.preview.emergentagent.com')

async def test_gemini_websocket():
    """Test Gemini WebSocket with proper handling"""
    
    # Convert HTTP URL to WebSocket URL
    ws_url = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://')
    ws_endpoint = f"{ws_url}/api/gemini/live"
    
    print(f"🔗 Connecting to: {ws_endpoint}")
    
    try:
        async with websockets.connect(ws_endpoint) as websocket:
            print("✅ WebSocket connection established")
            
            # Send a simple text message
            test_message = {
                "type": "text_message",
                "message": "Hello Gemini, can you hear me?"
            }
            
            await websocket.send(json.dumps(test_message))
            print("📤 Sent test message")
            
            # Wait for responses
            timeout_count = 0
            max_timeouts = 3
            
            while timeout_count < max_timeouts:
                try:
                    # Try to receive message with timeout
                    message = await asyncio.wait_for(websocket.recv(), timeout=5)
                    
                    # Handle different message types
                    if isinstance(message, str):
                        # Text message
                        try:
                            data = json.loads(message)
                            print(f"📨 Received JSON: {data}")
                        except json.JSONDecodeError:
                            print(f"📨 Received text: {message}")
                    elif isinstance(message, bytes):
                        # Binary message (audio data)
                        print(f"📨 Received binary data: {len(message)} bytes")
                    
                    timeout_count = 0  # Reset timeout count on successful receive
                    
                except asyncio.TimeoutError:
                    timeout_count += 1
                    print(f"⏱️  Timeout {timeout_count}/{max_timeouts}")
                    
                except Exception as e:
                    print(f"❌ Error receiving message: {str(e)}")
                    break
            
            print("✅ Gemini WebSocket test completed successfully")
            
    except websockets.exceptions.ConnectionClosed as e:
        print(f"❌ WebSocket connection closed: Code {e.code}, Reason: {e.reason}")
        if e.code == 1008:
            print("   This usually means the API is not enabled or configured properly")
    except Exception as e:
        print(f"❌ WebSocket connection failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_gemini_websocket())