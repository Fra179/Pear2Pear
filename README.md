<img src="website/static/assets/logo.webp" width="200" alt="Pear2Pear logo" title="Logo" >

# Pear2Pear.cc

Pear2Pear.cc is a peer-to-peer (P2P) file-sharing web application that allows users to transfer files directly between their devices without relying on third-party servers. The application uses WebRTC for the p2p file transfers and a signaling server written in go, to allow the initial connection.

## Features

- **P2P using WebRTC**: Users can transfer files directly without intermediaries.
- **Lightweight Signaling Server**: Written in Go using Gorilla Mux and Gorilla WebSockets.
- **Rate Limiting Support**: Optional addition of rate limiting for the backend using memcached.

## Tech Stack

### Frontend:

- TypeScript
- Tailwind CSS

### Backend (Signaling Server):

- Go
- Gorilla Mux
- Gorilla WebSockets
- Memcached (for rate limiting)

## Installation & Setup

### The Easy Way

Download the static website files from the [Releases](https://github.com/Fra179/Pear2Pear/releases/) and host them with your favorite hosting provider.

You can then decide to run the signaling server locally or use the one provided by the author.
The signaling server is available as a Docker container.

Additional information will be provided later.

## Usage

1. Open the website in a browser.
2. Share the generated connection link with the recipient.
3. Drag and drop files to start transferring.

## Releases

Pre-built binaries for the signaling server and the website are available in the [GitHub Releases](https://github.com/Fra179/Pear2Pear/releases/) section.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue.

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

