const receiverIdInput = document.getElementById('receiver-id')! as HTMLInputElement;
const fileUploadInput = document.getElementById('file-upload')! as HTMLInputElement;
const fileInfoDiv = document.getElementById('file-info')!;
const progressContainer = document.getElementById('progress-container')!;
const progressIndicator = document.querySelector('.progress-indicator')! as HTMLElement;
const progressPercentage = document.getElementById('progress-percentage')!;
const sendFileBtn = document.getElementById('send-file-btn')! as HTMLButtonElement;
const connectionStatus = document.getElementById('connection-status')!;
const copyIdBtn = document.getElementById('copy-id-btn')!;
const copyIdReceiveBtn = document.getElementById('copy-id-receive-btn')!;

// Modal elements
const closeModalBtn = document.getElementById('close-modal-btn')!;
const cancelTransferBtn = document.getElementById('cancel-transfer-btn')!;
const confirmTransferBtn = document.getElementById('confirm-transfer-btn')!;
const modalFilename = document.getElementById('modal-filename')!;
const modalFilesize = document.getElementById('modal-filesize')!;
const modalFiletype = document.getElementById('modal-filetype')!;
const confirmationModal = document.getElementById('confirmation-modal')!;

const TransferStatusIdle = "idle";
const TransferStatusConnecting = "connecting";
const TransferStatusTransferring = "transferring";
const TransferStatusCompleted = "completed";
const TransferStatusFailed = "failed";
let transferStatus = TransferStatusIdle; // idle, connecting, transferring, completed, failed

const WS_URL = "wss://signal.pear2pear.cc/ws"; // "ws://localhost:16969/ws";

let selectedFile: { name: string | null; size: number; type: string; } | File | null = null;
let activeTab = 'send';

// const sharedBuffer = new SharedArrayBuffer(4);
let counter = 1
let receivedSize = 0;
