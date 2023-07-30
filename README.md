# Marbles on kick.com

A local IRC server that proxies messages to kick.com instead of twitch.tv.

## Why?
I determined this was the easiest way to get Marbles on Stream working for Kick. There is one manual step with having to look up your kick chatroomId, but once Kick comes out with a public API it should be automated. This is fragile and may break in a Marbles on Stream update or a kick.com internal api update.

Assumptions:
* Streamer has same username on twitch and kick. This would be easy to enhance, but I'm not sure this needs to be solved.
* Users have same usernames on twitch and kick. If they don't match the users won't have their paid for marble skins.
* VIP and different tier sub colors won't be used. There is no way to map them to kick

### How to get it running using the release executable
1. Connect Marbles on Stream to your twitch.tv account and close Marbles on Stream
2. Download the latest Release
3. Use directions below to add your kick chatroom id to `chatroomIds.json` to be placed in same folder as the downloaded executable
4. Run marbles-on-kick executable
5. Run Marbles on Stream

If you ever want to run Marbles on Stream on twitch.tv OR switch accounts on Marbles on Stream, see the revert section at the bottom

### How to get it running building with node
1. Connect Marbles on Stream to your Twitch.tv account if it isn't already. If you run this project before doing this you will need to have Steam Verify your files and unpatch the exe.
2. Download this project 
3. [Install nvm](https://github.com/coreybutler/nvm-windows/releases) (Download and install `nvm-setup.exe`)
4. Open command prompt to the project directory
   1. `nvm install 18` install and use node 18
   2. `nvm use 18`
   3. `npm install` install the dependencies for this project
5. Update `chatroomIds.json` with your kick.com chatroom username/id. Instructions given below
6. Make sure Marbles on Stream is closed
7. Start the program `npm start` and wait until it says `Proxy server starting`
8. Run Marbles on Stream

Then each time after to play marbles you:


### Add your channelId to chatroomIds.json
1. Navigate to kick.com on your browser
1. Press F12 to open dev console
1. Click on Console tab near the top left of dev console
1. Replace YOUR_KICK_USERNAME in script and paste/execute in dev console `fetch("https://kick.com/api/v2/channels/YOUR_KICK_USERNAME/chatroom").then(resp => resp.json()).then(json => console.log(json.id));`
1. Copy the number printed in the dev console and make an entry in `chatroomIds.json`. Make it the first entry in the list with a `,` at the end to reduce chance of causing an issue.

### How to revert Marbles on Stream patch
Go to Steam Library -> Right click on Marbles on Stream -> Properties -> Installed Files -> click "Verify integrity of game files"
