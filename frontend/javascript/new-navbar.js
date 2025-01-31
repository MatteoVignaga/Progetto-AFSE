var navbar = `<nav class="navbar navbar-expand-md custom-navbar p-2">
    <div class="container-fluid">
        
        <img class="m-4" src="img/Marvel_Logo.svg.png" alt="Marvel logo" width="20%" style="min-width: 140px">
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavAltMarkup"
            aria-controls="navbarNavAltMarkup" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        
        <div class="collapse navbar-collapse p-3" id="navbarNavAltMarkup">
            
            <ul id="menu-list" class="navbar-nav me-auto my-2 my-lg-0 navbar-nav-scroll" style="--bs-scroll-height: 100px;">
                <li class="nav-item">
                    <a class="nav-link" aria-current="page" href="home.html">Home</a>
                </li>
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                        Mercato
                    </a>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="mercato-pacchetti.html">Pacchetti di figurine</a></li>
                        <li><a class="dropdown-item" href="mercato-scambi.html">Scambi di figurine</a></li>
                        <li>
                            <hr class="dropdown-divider">
                        </li>
                        <li><a class="dropdown-item" href="mercato-crediti.html">Crediti</a></li>
                    </ul>
                </li>
            </ul>
            
            <div class="row" id="contenitore-per-utente">
                <div class="col-auto justify-content-center align-content-center" id="navbar-contenitore-crediti-utente">
                    
                </div>
                <div class="col-auto">
                    <a href="#" id="icona-utente"><img class="m-2" id="user-icon" src="img/pngwing.com.png" alt="User" width="40px"></a>
                </div>
                <div class="col-auto" id="contenitore-pulsanti">
                    
                </div>
            </div>
        </div>

    </div>
</nav>`;

document.getElementById("navbar-container").innerHTML = navbar;

var contenitore_per_utente = document.getElementById("contenitore-per-utente");
var utente = JSON.parse(localStorage.getItem("utente"));

if (utente) {
    contenitore_per_utente.querySelector('#navbar-contenitore-crediti-utente').innerHTML = `<div> <strong> Crediti: </strong> <span id="navbar-crediti-utente">${utente.crediti}</span></div>`;
    contenitore_per_utente.querySelector('#icona-utente').href = 'scheda-utente.html'
    
    var login_button = `<div class="row" id="login-button">
                            <div class="col"><a href="login.html" style="color: white; font-size: large;">Login</a></div>
                        </div>`
    var logout_button = `<div class="row" id="logout-button">
                            <div class="col"><a href="#" onclick="logout()" style="color: white; font-size: large;">Logout</a></div>
                        </div>`
    contenitore_per_utente.querySelector('#contenitore-pulsanti').innerHTML += login_button;
    contenitore_per_utente.querySelector('#contenitore-pulsanti').innerHTML += logout_button;

    if (utente.dev) {
        var dev_tools = `<li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                                Dev Tools
                            </a>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="creazione-offerta.html">Creazione pacchetti</a></li>
                            </ul>
                        </li>`
        document.getElementById("menu-list").innerHTML += dev_tools;
    }
} else {
    //contenitore_per_utente.querySelector('#navbar-contenitore-crediti-utente') = '';
    contenitore_per_utente.querySelector('#icona-utente').href = 'login.html'
    
    var login_button = `<div class="row" id="login-button">
                            <div class="col"><a href="login.html" style="color: white; font-size: large;">Login</a></div>
                        </div>`
    var sign_up_button = `<div class="row" id="sign-up-button">
                            <div class="col"><a href="signup.html" style="color: white; font-size: large;">Registrati</a></div>
                        </div>`
    contenitore_per_utente.querySelector('#contenitore-pulsanti').innerHTML += login_button;
    contenitore_per_utente.querySelector('#contenitore-pulsanti').innerHTML += sign_up_button;
}