
function handleLikeClick(event) {
    const postId = event.target.getAttribute("data-id");

    const likeCount = document.getElementById("like-count-" + postId);
    const updatedLikeCount = parseInt(likeCount.getAttribute("count")) + 1;

    likeCount.textContent = updatedLikeCount.toString() + " Likes";
    likeCount.setAttribute("count", updatedLikeCount.toString());
}

function eventListeners() {
    const postId = document.currentScript.getAttribute("post");

    const likeButton = document.getElementById("like-icon-" + postId);
    if (likeButton) {
        likeButton.addEventListener("click", handleLikeClick);
    }
}

eventListeners();