
/*
 You want to show a subset of the emojis. About 200. However,
 you also want the user to be able to search all emojis,
 so, put them in this array when the array is empty so 
 that you have them.
*/

let allEmojis = [];  // Global list to hold all emojis

const getEmojis = async() => {
    const emoji_data = await fetch("/emojis");
    allEmojis = await emoji_data.json();
}

//not wild about this solution, but the way i see it if this calls getEmojis it HAS to be async
//potential other option: call getEmojis on load -Jack
async function toggleEmojiPanel() {
    const container = document.getElementById("emoji-container");
    container.style.display = container.style.display === "none" ? "block" : "none";

    if (container.style.display === "block" && allEmojis.length == 0) {
        // go "Fetch" you some emojis and show them off with displayEmojies
        await getEmojis();
        displayEmojis(allEmojis);
    }
}

function displayEmojis(emojis, limit=200) {
    const container = document.getElementById("emoji-grid");
    container.replaceChildren();  // Clear previous results
    if (Array.isArray(emojis) && emojis.length > 0) {
        emojis.slice(0, limit).forEach(emoji => {
            const emojiElement = document.createElement("span");
            emojiElement.textContent = emoji.character;
            emojiElement.title = emoji.slug;  // Showing the emoji name on hover
            emojiElement.style.cursor = "pointer";
            emojiElement.addEventListener("click", () => insertEmoji(emoji.character));
            container.appendChild(emojiElement);
        });
    } else {
        const paragraph = document.createElement("p");
        paragraph.textContent = "No emojis found. Try a different search!";
        container.appendChild(paragraph);
    }
}

function searchEmojis() {
    const searchTerm = document.getElementById("emoji-search").value.toLowerCase();
    // array.filter takes a predicate
    // use string.includes. 
    const filteredEmojis = allEmojis.filter(emj => emj.slug.includes(searchTerm));
    displayEmojis(filteredEmojis);
}

function insertEmoji(emoji) {
    const textarea = document.getElementById("post-content-input");
    textarea.value += emoji;
    textarea.focus();
}

function handleRedirect() {
    const dropdown = document.getElementById("sort-dropdown");
    const selectedValue = dropdown.value;
    if (selectedValue) {
        window.location.href = "/sort/" + selectedValue;
    }
}

function eventListeners() {
    const sortCriteria = document.getElementById("sort-criteria").textContent;
    document.getElementById("sort-dropdown").value = sortCriteria;
    
    const emojiButton = document.getElementById("emoji-button");
    const emojiSearch = document.getElementById("emoji-search");
    if (emojiButton && emojiSearch) {
        emojiButton.addEventListener("click", toggleEmojiPanel);
        emojiSearch.addEventListener("input", searchEmojis);
    }

    const sortDropdown = document.getElementById("sort-dropdown");
    sortDropdown.addEventListener("change", handleRedirect);
}

eventListeners();
