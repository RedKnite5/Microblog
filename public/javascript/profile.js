
function showDeleteModal() {
    const deleteModal = document.getElementById("delete-modal");
    deleteModal.style.display = "flex";
}

function closeModal() {
    const deleteModal = document.getElementById("delete-modal");
    deleteModal.style.display = "none";
}

function editingUsername() {
    const usernameSpan = document.getElementById("current-username");
    const usernameForm = document.getElementById("update-username-form");

    usernameSpan.style.display = "none";
    usernameForm.style.display = "inline";
}

function changeUsername() {
    const usernameSpan = document.getElementById("current-username");
    const usernameForm = document.getElementById("update-username-form");

    usernameSpan.style.display = "inline";
    usernameForm.style.display = "none";

    usernameForm.submit();
}

function handleRedirect() {
    const dropdown = document.getElementById("sort-dropdown");
    const selectedValue = dropdown.value;
    if (selectedValue) {
        window.location.href = "/profile/sort/" + selectedValue;
    }
}

function eventListeners() {
    const sortCriteria = document.getElementById("sort-criteria").textContent;
    document.getElementById("sort-dropdown").value = sortCriteria;

    const sortDropdown = document.getElementById("sort-dropdown");
    sortDropdown.addEventListener("change", handleRedirect);

    const closeModals = document.getElementsByClassName("close-modal");
    for (const button of closeModals) {
        button.addEventListener("click", closeModal);
    }

    const editUsername = document.getElementById("edit-username");
    editUsername.addEventListener("click", editingUsername);

    const deleteAccountButton = document.getElementById("delete-account-button");
    deleteAccountButton.addEventListener("click", showDeleteModal);

    const usernameInput = document.getElementById("username-input");
    usernameInput.addEventListener("focusout", changeUsername);

    const fileInput = document.getElementById("fileInput")
    const fileButton = document.getElementById("upload-avatar-button")
    fileButton.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => fileInput.parentElement.submit());
}

eventListeners();
