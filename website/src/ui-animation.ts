// Helper functions
function updateSendButtonState() {
    const canSend = selectedFile !== null && receiverIdInput.value !== "" && activeTab === 'send' && (transferStatus === 'idle' || transferStatus === 'failed' || transferStatus === 'completed');
    sendFileBtn.disabled = !canSend;
}

function resetTransfer() {
    selectedFile = null;
    receivedSize = 0;

    // Reset UI
    // updateConnectionStatus(TransferStatusIdle);
    updateProgressBar(0);
    progressContainer.classList.add('hidden');
    fileInfoDiv.classList.add('hidden');
    sendFileBtn.classList.remove('hidden');
    counter = 1;

    // Enable inputs
    receiverIdInput.disabled = false;
    fileUploadInput.disabled = false;
    fileUploadInput.value = '';

    updateSendButtonState();
}

function updateProgressBar(value: number) {
    progressContainer.classList.remove('hidden');
    progressIndicator.style.transform = `translateX(-${100 - value}%)`;
    progressPercentage.textContent = `${Math.round(value)}%`;
}

function updateConnectionStatus(status: string) {
    transferStatus = status;
    let statusHTML = '';

    if (transferStatus === "idle") {
        statusHTML = `
            <span class="badge badge-outline gap-1">
              <i class="fa-solid fa-link-slash"></i>
              Disconnected
            </span>
          `;
    } else if (transferStatus === "connecting") {
        statusHTML = `
            <span class="badge badge-outline gap-1" style="background-color: rgba(234, 179, 8, 0.1); color: rgb(161, 98, 7); border-color: rgba(234, 179, 8, 0.2);">
              <i class="fa-solid fa-link"></i>
              Connecting
            </span>
          `;
    } else if (transferStatus === "transferring") {
        statusHTML = `
            <span class="badge badge-outline gap-1" style="background-color: rgba(59, 130, 246, 0.1); color: rgb(37, 99, 235); border-color: rgba(59, 130, 246, 0.2);">
              <i class="fa-solid fa-link"></i>
              Connected
            </span>
          `;
    } else if (transferStatus === "completed") {
        statusHTML = `
            <span class="badge badge-outline gap-1" style="background-color: rgba(34, 197, 94, 0.1); color: rgb(22, 163, 74); border-color: rgba(34, 197, 94, 0.2);">
              <i class="fa-solid fa-check"></i>
              Completed
            </span>
          `;
    } else if (transferStatus === "failed") {
        statusHTML = `
            <span class="badge badge-outline gap-1" style="background-color: rgba(239, 68, 68, 0.1); color: rgb(220, 38, 38); border-color: rgba(239, 68, 68, 0.2);">
              <i class="fa-solid fa-circle-exclamation"></i>
              Failed
            </span>
          `;
    }

    connectionStatus.innerHTML = statusHTML;
}

function requestSharePermission(file: { name: string | null; size: number; type: string; }) {
    // Create a modal dialog
    modalFilename.textContent = file.name;
    modalFilesize.textContent = humanReadableFileSize(file.size);
    modalFiletype.textContent = file.type;

    confirmationModal.classList.add("active");

    // Modal close button
    closeModalBtn.onclick = () => {
        dataChannel.send("rejected")
        confirmationModal.classList.remove('active');
        console.log("Sending rejected")
        updateConnectionStatus(TransferStatusFailed);
    }

    // Cancel transfer button
    cancelTransferBtn.onclick = () => {
        dataChannel.send("rejected")
        confirmationModal.classList.remove('active');
        console.log("Sending rejected")
        updateConnectionStatus(TransferStatusFailed);
    }


    // Confirm transfer button
    confirmTransferBtn.onclick = async () => {
        await setupReceiverDataChannel()
        dataChannel.send("accepted");
        confirmationModal.classList.remove('active');
        console.log("Sending accepted")
        updateConnectionStatus(TransferStatusTransferring);
    }
}

(async () => {
    // Tab switching
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    updateSendButtonState()

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab')!;

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show corresponding content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${tabName}-tab`)!.classList.add('active');

            activeTab = tabName;
            updateSendButtonState();
        });
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', (e) => {
        if (e.target === confirmationModal) {
            window.addEventListener('click', (e) => {
                if (e.target === confirmationModal) {
                    confirmationModal.classList.remove('active');
                }
            });

            // Initialize button state
            updateSendButtonState();
        }
    });

    receiverIdInput.onchange = () => {
        updateSendButtonState();
    }

    fileUploadInput.onchange = () => {
        if (!fileUploadInput.files || fileUploadInput.files.length === 0 || !fileUploadInput.files[0] || !fileUploadInput.files[0].size) {
            selectedFile = null;
            return;
        }

        selectedFile = fileUploadInput.files[0];

        updateSendButtonState();
    }

    copyIdBtn.addEventListener("click", () => {
        copyIdBtn.classList.add("show-msg");
        setTimeout(() => copyIdBtn.classList.remove("show-msg"), 2000);
    })

    copyIdReceiveBtn.addEventListener("click", () => {
        copyIdReceiveBtn.classList.add("show-msg");
        setTimeout(() => copyIdReceiveBtn.classList.remove("show-msg"), 2000);
    })
})();