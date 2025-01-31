function validaEmail(email) {
    var feedback = "";
    var valid = true;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        feedback += "Email non valida.\n";
        valid = false;
    }

    if (!valid) {
        document.getElementById("invalid-email-feedback").innerHTML = feedback;
        document.getElementById("invalid-email-feedback").classList.remove("d-none");
        document.getElementById("email").classList.add("is-invalid");
    } else {
        document.getElementById("invalid-email-feedback").classList.add("d-none");
        document.getElementById("email").classList.remove("is-invalid");
    }

    return valid;
}

function validaPassword(password, password2) {
    var feedback = "";
    var valid = true;

    if (password != password2) {
        feedback += "Le password non coincidono.\n";
        valid = false;
    } else if (password.length < 8) {
        feedback += "La password è troppo corta.\n";
        valid = false;
    } else if (!/[a-z]+/.test(password)) {
        feedback += "La password deve contenere almeno una lettera minuscola.\n";
        valid = false;
    } else if (!/[A-Z]+/.test(password)) {
        feedback += "La password deve contenere almeno una lettera maiuscola.\n";
        valid = false;
    } else if (!/[0-9]+/.test(password)) {
        feedback += "La password deve contenere almeno un numero.\n";
        valid = false;
    }

    if (!valid) {
        document.getElementById("invalid-password-feedback").innerHTML = feedback;
        document.getElementById("invalid-password-feedback").classList.remove("d-none");
        document.getElementById("password1").classList.add("is-invalid");
        document.getElementById("password2").classList.add("is-invalid");
    } else {
        document.getElementById("invalid-password-feedback").classList.add("d-none");
        document.getElementById("password1").classList.remove("is-invalid");
        document.getElementById("password2").classList.remove("is-invalid");
    }

    return valid;
}

function logout() {
    localStorage.removeItem("utente");
    location.reload();
}

