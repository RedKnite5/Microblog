
const button = document.getElementById("Login")
button.addEventListener("click", goToGoogle);

function goToGoogle() {
    window.location.replace('/auth/google')
}
