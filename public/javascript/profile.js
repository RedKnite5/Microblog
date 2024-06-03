
function showDeleteModal() {
    const deleteModal = document.getElementById("delete-modal");
    deleteModal.style.display = "flex";
}

function closeModal() {
    const deleteModal = document.getElementById("delete-modal");
    deleteModal.style.display = "none";
}

function deleteAccount() {
    const deleteModal = document.getElementById("delete-modal");
    deleteModal.style.display = "none";
    fetch("/deleteAccount", {
        method: "POST",
        headers: {"Content-Type": "text/plain"}, 
        body: ""
    }).then(res => {
        window.location.href = "/logout";
    });
}

function editingUsername() {
    const usernameSpan = document.getElementById("current-username");
    const usernameInput = document.getElementById("username-input");

    usernameSpan.style.display = "none";
    usernameInput.style.display = "inline";
}

function changeUsername() {
    const usernameSpan = document.getElementById("current-username");
    const usernameInput = document.getElementById("username-input");

    usernameSpan.style.display = "inline";
    usernameInput.style.display = "none";

    fetch("/updateUsername", {
        method: "POST",
        headers: {"Content-Type": "application/json"}, 
        body: JSON.stringify({"name": usernameInput.value})
    }).then(res => {
        window.location.href = "/profile";
    });
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

    const DELETEAccount = document.getElementById("DELETE-account");
    DELETEAccount.addEventListener("click", deleteAccount);

    const usernameInput = document.getElementById("username-input");
    usernameInput.addEventListener("focusout", changeUsername);

    const fileInput = document.getElementById("fileInput")
    const fileButton = document.getElementById("upload-avatar-button")
    fileButton.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => fileInput.parentElement.submit());

}

eventListeners();
