# Public Chat Room

## Current State
New project with no existing implementation.

## Requested Changes (Diff)

### Add
- Public chat room where anyone can send messages and images
- Name entry before chatting (no login required)
- Real-time message display with sender name and timestamp
- Image upload and display in chat
- Mobile-responsive layout

### Modify
- N/A

### Remove
- N/A

## Implementation Plan
1. Backend: Store messages (text + optional image) with sender name and timestamp. Expose APIs to post messages and retrieve all messages.
2. Frontend: Single chat page with name prompt, message list (bubbles), text input, image upload button, and send button.
3. Poll backend every few seconds for new messages to simulate real-time updates.
