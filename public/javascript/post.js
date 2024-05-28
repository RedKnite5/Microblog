
function handleLikeClick(event) {
    const postId = event.target.getAttribute("data-id");

    const likeCount = document.getElementById("like-count-" + postId);
    const updatedLikeCount = parseInt(likeCount.getAttribute("count")) + 1;

    likeCount.textContent = updatedLikeCount.toString() + " Likes";
    likeCount.setAttribute("count", updatedLikeCount.toString());

    fetch("/like/" + postId, {method: "POST"});
}

function handleDeleteClick(event) {
    const buttonElement = event.target.closest(".delete-button");
    const postId = buttonElement.getAttribute("data-id");
}

function eventListeners() {
    const postId = document.currentScript.getAttribute("post");

    const likeButton = document.getElementById("like-icon-" + postId);
    if (likeButton) {
        likeButton.addEventListener("click", handleLikeClick);
    }
}

eventListeners();