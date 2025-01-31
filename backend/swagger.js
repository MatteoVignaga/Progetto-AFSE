const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' });

const doc = {
    info: {
        title: 'AFSE API',
        description: 'Ecco la documentazione dell\'API di AFSE'
    },
    host: 'localhost:3000',
    components: {
        schemas: {
            getUserSchema: {
                $nome: 'Matteo',
                $cognome: 'Vignaga',
                $email: 'mvteo@gmail.com',
                $password: 'password',
                $eroe_preferito: 'Spiderman',
                $album: [],
                $carte_da_scambiare: []
            },
            putUserSchema: {
                nome: 'Matteo',
                cognome: 'Vignaga',
                email: 'mvteo@gmail.com',
                password: 'password',
                eroe_preferito: 'Spiderman',
                album: [],
                carte_da_scambiare: []
            },
            putCardSchema: {
                quantita: 1
            },
            offerSchema: {
                $offerente: '66b48f9839c932492aa49a83',
                descrizione: 'Offerta di scambio',
                $carte_offerte: [],
                offerte_ricevute: []
            },
            propostaSchema: {
                $proponente: '66b48f9839c932492aa49a83',
                $carte_proposte: []
            },
            packSchema: {
                $titolo: 'Pack di carte',
                descrizione: 'Qui puoi descrivere l\'offerta di carte, se vuoi',
                $prezzo: 5,
                $quantita_carte: 5,
                $thumbnail: 'base64 di un\'immagine'
            },
            cardSchema: {
                $id: 1009718,
                $name: 'Wolverine',
                description: 'Mutante con artigli di adamantio',
                $thumbnail: 'http://i.annihil.us/u/prod/marvel/i/mg/2/60/537bcaef0f6cf.jpg'
            }
        }
    }
};

const outputFile = './swagger-output.json';
const routes = ['./index.js'];

swaggerAutogen(outputFile, routes, doc);