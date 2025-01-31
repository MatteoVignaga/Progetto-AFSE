require('dotenv').config();
var express = require('express');
var md5 = require('md5');
var cors = require('cors');
var app = express();
const path = require('path');
app.use(express.json({ limit: '10mb' }));
app.use(cors());
var port = 3000;
var ts = 1;
const public_apikey = process.env.PUBLIC_API_KEY;
const private_apikey = process.env.PRIVATE_API_KEY;
var hash = md5(ts + private_apikey + public_apikey);
const { MongoClient, ObjectId } = require('mongodb');
const uri = process.env.DATABASE_URI;
const mongoClient = new MongoClient(uri);
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', function(req, res) {
    const filePath = path.join(__dirname, '../frontend/html/home.html');
    res.sendFile(filePath, function(err) {
        if (err) {
            console.error("Error sending file:", err);
            res.status(err.status).end();
        }
    });
});

app.post('/users', async function(req, res) {
    /*  #swagger.requestBody = {
            required: true,
            description: "Permette di inserire un utente.",
            content: {
                "application/json": {
                    schema: {
                        $ref: "#/components/schemas/getUserSchema"
                    }  
                }
            }
        } 
    */
    console.log("Add user: ");
    console.log(req.body);
    console.log();
    addUser(res, req.body);
});

async function addUser(res, user) {
    if (user.nome !== undefined && user.cognome !== undefined && user.password !== undefined) {
        if (user.nome.length < 3) {
            res.status(400).send("Nome troppo corto o mancante");
            return;
        }

        if (user.cognome.length < 3) {
            res.status(400).send("Cognome troppo corto o mancante");
            return;
        }
        
        if (user.password.length < 8) {
            res.status(400).send("Password troppo corta o mancante");
            return;
        }

    } else {
        res.status(400).send("Campi assenti.");
        return;
    }

    user.password = md5(user.password);

    var conn = await mongoClient.connect();
    try {
        var inserted = await conn.db("AFSE").collection("Users").insertOne(user);
        console.log("Insert:");
        console.log(inserted);
        console.log();
    } catch (e) {
        if (e.code === 11000) {
            res.status(409).send("Risulti già registrato.");
        } else {
            res.status(500).send("Errore interno generico: " + e.code);
        }
    } finally {
        await conn.close();
    }

    res.status(201).send(inserted);
}

app.put('/users/:id', async function(req, res) {
    /*  #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        $ref: "#/components/schemas/putUserSchema"
                    }  
                }
            }
        } 
    */
    var user = req.body;
    if (!user || Object.keys(user).length == 0) { res.status(400).send("Campi assenti."); return; }
    
    delete user._id; //non dev'essere mai modificato, dunque lo rimuovo
    var id = req.params.id;
    console.log("Ricevuta richiesta di update user: ");
    console.log(id);
    console.log();

    updateUser(res, id, user);
});

async function updateUser(res, id, user) {

    var conn = await mongoClient.connect();
    try {
        var existingUser = await conn.db("AFSE").collection("Users").findOne({ _id: ObjectId.createFromHexString(id) });
        console.log("Existing user:");
        console.log(existingUser._id);
        if (!existingUser) {
            res.status(404).send("Utente non trovato.");
            return;
        }

        //in questo caso sto modificando la password, dunque serve fare l'hash nuovo
        if (user.password !== undefined && user.password !== existingUser.password) {
            user.password = md5(user.password);
        }

        var updated = await conn.db("AFSE").collection("Users").updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: user });
        console.log("Update:");
        console.log(updated);

        res.status(200).send(updated);
    } catch (e) {
        res.status(500).send("Errore interno generico: " + e.code);
    } finally {
        await conn.close();
    }

    
}

app.put('/users/:user_id/cards/:card_id', (req, res) => {
    /*  #swagger.requestBody = {
            required: true,
            description: "Modifica la quantita di una carta.",
            content: {
                "application/json": {
                    schema: {
                        $ref: "#/components/schemas/putCardSchema"
                    }  
                }
            }
        } 
    */

    var user_id = req.params.user_id;
    var card_id = req.params.card_id; //NOTA: card_id è l'id dell'eroe nell'API Marvel
    var card = req.body;

    console.log("Ricevuta richiesta di update card: ");
    console.log(user_id);
    console.log(card_id);
    console.log(card);
    console.log();

    updateCard(res, user_id, card_id, card);
});

async function updateCard(res, user_id, card_id, card) {
    var conn = await mongoClient.connect();
    
    try {
        var updated = await conn.db("AFSE").collection("Users").updateOne(
            { _id: ObjectId.createFromHexString(user_id), "album.id": parseInt(card_id) }, 
            { $set: { "album.$.quantita": card.quantita } }
        );
        console.log("Update:");
        console.log(updated);
        res.status(200).send(updated);
    } catch (e) {
        res.status(500).send("Errore interno generico: " + e.code);
    } finally {
        await conn.close();
    }
}

app.delete('/users/:id', async function(req, res) {
    var id = req.params.id;
    deleteUser(res, id);
});

async function deleteUser(res, id) {
    var conn = await mongoClient.connect();
    try {
        var deleted = await conn.db("AFSE").collection("Users").deleteOne({ _id: ObjectId.createFromHexString(id) });
        console.log("Delete: " + deleted);

        if (deleted.deletedCount === 0) {
            res.status(404).send("Utente non trovato.");
        }

        res.status(200).send(deleted);
    } catch (e) {
        res.status(400).send("Errore nella cancellazione dell'utente. Dettagli: " + e);
    }
}

app.get('/offers', async function(req, res) {
    console.log("Ricevuta richiesta di offerte.");
    
    var conn = await mongoClient.connect();
    try {
        var offers = await conn.db("AFSE").collection("Offers").find().toArray();
        res.status(200).send(offers);
    } catch (e) {
        res.status(500).send("Errore interno generico: " + e.code);
    } finally {
        await conn.close();
    }
});

app.get('/offers/:id', async function(req, res) {
    var id = req.params.id;
    console.log("Ricevuta richiesta di offerta: ");
    console.log(id);

    getOffer(res, id);
});

async function getOffer(res, id) {
    var conn = await mongoClient.connect();
    try {
        var offerta = await conn.db("AFSE").collection("Offers").findOne({ _id: ObjectId.createFromHexString(id) });
        if (offerta === null) {
            res.status(404).send("Offerta non trovata.");
        } else {
            res.status(200).send(offerta);
        }
    } catch (e) {
        res.status(500).send("Errore interno generico: " + e.code);
    } finally {
        await conn.close();
    }
}

app.post('/offers', async function(req, res) {
    /* #swagger.requestBody = {
            required: true,
            description: "Aggiungi una offerta di scambio alla collection delle offerte.",
            content: {
                "application/json": {
                    schema: { $ref: "#/components/schemas/offerSchema" },
                }
            }
        }
    */
    var offerta = req.body;

    if (!offerta || Object.keys(offerta).length == 0 || offerta.offerente === undefined || offerta.carte_offerte === undefined) {
        res.status(400).send("Campi assenti.");
        return;
    }

    if (offerta.carte_offerte.length === 0) {
        res.status(400).send("E' necessario offrire almeno una carta.");
        return;
    }
    console.log("Ricevuta richiesta di aggiunta offerta: ");
    console.log(offerta);
    console.log();

    aggiungiOfferta(res, offerta);
});

async function aggiungiOfferta(res, offerta) {
    var conn = await mongoClient.connect();
    var session = conn.startSession();

    try {
        session.startTransaction();

        //aggiungi offerta nella collection delle offerte
        var inserted1 = await conn.db("AFSE").collection("Offers").insertOne(offerta, { session: session });
        console.log("Insert: ");
        console.log(inserted1);
        console.log();

        //aggiungi offerta nel documento dell'utente
        offerta._id = inserted1.insertedId;
        var inserted2 = await conn.db("AFSE").collection("Users").updateOne(
            { _id: ObjectId.createFromHexString(offerta.offerente) }, 
            { $push: { carte_da_scambiare: offerta } }, 
            { session: session }
        );
        console.log("Insert2: ");
        console.log(inserted2);
        console.log();

        //riduci la quantità delle carte offerte
        for (const card of offerta.carte_offerte) {
            var updated = await conn.db("AFSE").collection("Users").updateOne(
                { _id: ObjectId.createFromHexString(offerta.offerente), "album.id": card.id },
                { $inc: { "album.$.quantita": -1 } },
                { session: session }
            );
            console.log("Update: ");
            console.log(updated);
            console.log();
        }

        await session.commitTransaction();
        res.status(201).send(inserted1);
    } catch (e) {
        await session.abortTransaction();
        res.status(500).send("Transazione abortita per aggiunta dell'offerta al db: " + e.code);
    } finally {
        session.endSession();
        await conn.close();
    }
}

app.put('/offers/:id/proposte', async function(req, res) {
    /* #swagger.requestBody = {
            required: true,
            description: "Fai una proposta ad una offerta di un altro utente.",
            content: {
                "application/json": {
                    schema: { $ref: "#/components/schemas/propostaSchema" },
                }
            }
        }
    */
    var offer_id = req.params.id;
    var proposta = req.body;

    if (!proposta || Object.keys(proposta).length == 0 || proposta.proponente === undefined || proposta.carte_proposte === undefined) {
        res.status(400).send("Campi assenti.");
        return;
    }

    if (proposta.carte_proposte.length === 0) {
        res.status(400).send("E' necessario proporre almeno una carta.");
        return;
    }

    console.log("Ricevuta richiesta di update proposte per offerta: ");
    console.log(offer_id);
    console.log(proposta);
    console.log();

    updateProposte(res, offer_id, proposta);
});

async function updateProposte(res, offer_id, proposta) {
    if (!proposta) {
        res.status(400).send("Campi assenti per la request: proposta");
        return;
    }
    
    var conn = await mongoClient.connect();
    var session = conn.startSession();
    session.startTransaction();

    try {
        //aggiungi proposta all'offerta
        var updated1 = await conn.db("AFSE").collection("Offers").updateOne(
            { _id: ObjectId.createFromHexString(offer_id) },
            { $push: { offerte_ricevute: proposta } },
            { session: session }
        );
        console.log("Update offer: ");
        console.log(updated1);
        console.log();

        //aggiungi proposta al documento dell'utente
        var offerta = await conn.db("AFSE").collection("Offers").findOne({ _id: ObjectId.createFromHexString(offer_id) });
        console.log("Offerta: ");
        console.log(offerta);
        console.log();
        if (offerta === null) {
            res.status(404).send("Offerta non trovata.");
            return;
        }

        var updated2 = await conn.db("AFSE").collection("Users").updateOne(
            { _id: ObjectId.createFromHexString(offerta.offerente) },
            { $push: { "carte_da_scambiare.$[elem].offerte_ricevute": proposta } },
            {
                arrayFilters: [ { "elem._id": ObjectId.createFromHexString(offer_id) } ],
                session: session
            }
        );
        console.log("Update user offer: ");
        console.log(updated2);
        console.log();

        //riduci la quantità delle carte proposte
        var id_carte_proposte = proposta.carte_proposte.map(c => c.id);
        var update1 = await conn.db("AFSE").collection("Users").updateMany(
            { _id: ObjectId.createFromHexString(proposta.proponente) },
            { $inc: { "album.$[card].quantita": -1 } },
            { 
                arrayFilters: [ { "card.id": { $in: id_carte_proposte } } ],
                session: session 
            }
        );
        console.log("Update carte proposte: ");
        console.log(update1);
        console.log();

        await session.commitTransaction();
        console.log("Transazione completata con successo.\n");
        res.status(200).send("Proposta aggiunta con successo.");
    } catch (e) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.log("Problema nella transazione per l'aggiunta della proposta.\n");
        res.status(500).send("Transazione abortita: " + e.code);
    } finally {
        session.endSession();
        await conn.close();
    }
}

app.put('/offers/:id/proposte/reject', (req, res) => {
    /* #swagger.requestBody = {
            required: true,
            description: "Rifiuta la proposta di un altro utente alla offerta.",
            content: {
                "application/json": {
                    schema: { $ref: "#/components/schemas/propostaSchema" },
                }
            }
        }
    */
    var offer_id = req.params.id;
    var proposta = req.body.proposta;

    if (!proposta || Object.keys(proposta).length == 0 || proposta.proponente === undefined || proposta.carte_proposte === undefined) {
        res.status(400).send("Campi assenti.");
        return;
    }

    console.log("Ricevuta richiesta di reject proposta: ");
    console.log(offer_id);
    console.log(proposta);
    console.log();
    rejectProposta(res, offer_id, proposta);
});

async function rejectProposta(res, offer_id, proposta) {
    if (!proposta) {
        res.status(400).send("Campi assenti per la request: proposta");
        return;
    }

    var conn = await mongoClient.connect();
    var session = conn.startSession();
    session.startTransaction();
    
    try {
        //recupera offerta
        var offerta = await conn.db("AFSE").collection("Offers").findOne({ _id: ObjectId.createFromHexString(offer_id) });
        
        if (offerta === null) {
            await session.abortTransaction();
            console.log("Offerta non trovata.\n");
            res.status(404).send("Offerta non trovata.");
            return;
        }

        //rimuovi proposta dall'offerta nella collection offerte
        var updated1 = await conn.db("AFSE").collection("Offers").updateOne(
            { _id: ObjectId.createFromHexString(offer_id) },
            { $pull: { offerte_ricevute: { proponente: proposta.proponente, carte_proposte: proposta.carte_proposte } } },
            { session: session }
        );

        if (updated1.modifiedCount === 0) {
            await session.abortTransaction();
            console.log("Proposta non trovata nella collection delle offerte.\n");
            res.status(404).send("Proposta non trovata nella collection delle offerte.");
            return;
        }

        //rimuovi proposta dal documento dell'utente offerente
        var updated2 = await conn.db("AFSE").collection("Users").updateOne(
            { _id: ObjectId.createFromHexString(offerta.offerente) },
            { $pull: { "carte_da_scambiare.$[elem].offerte_ricevute": { proponente: proposta.proponente, carte_proposte: proposta.carte_proposte } } },
            {
                arrayFilters: [ { "elem._id": ObjectId.createFromHexString(offer_id) } ],
                session: session
            }
        );

        if (updated2.modifiedCount === 0) {
            await session.abortTransaction();
            console.log("Proposta non trovata nel documento dell'utente offerente.\n");
            res.status(404).send("Proposta non trovata nel documento dell'utente offerente.");
            return;
        }

        //incrementa la quantità delle carte proposte nel documento dell'utente proponente
        var id_carte_proposte = proposta.carte_proposte.map(c => c.id);
        var updated3 = await conn.db("AFSE").collection("Users").updateMany(
            { _id: ObjectId.createFromHexString(proposta.proponente) },
            { $inc: { "album.$[card].quantita": 1 } },
            { 
                arrayFilters: [ { "card.id": { $in: id_carte_proposte } } ],
                session: session 
            }
        );

        if (updated3.modifiedCount === 0) {
            await session.abortTransaction();
            console.log("Carte proposte non trovate nel documento dell'utente proponente.\n");
            res.status(404).send("Carte proposte non trovate nel documento dell'utente proponente.");
            return;
        }

        await session.commitTransaction();
        console.log("Transazione completata con successo.\n");
        res.status(200).send("Proposta rifiutata con successo.");
    } catch (e) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.log("Problema nella transazione per il reject della proposta.\n");
        res.status(500).send("Transazione abortita: " + e.code);
    } finally {
        await session.endSession();
        await conn.close();
    }
}

app.put('/offers/:id/proposte/accept', (req, res) => {
    /* #swagger.requestBody = {
            required: true,
            description: "Accetta la proposta di un altro utente alla offerta.",
            content: {
                "application/json": {
                    schema: { $ref: "#/components/schemas/propostaSchema" },
                }
            }
        }
    */
    var offer_id = req.params.id;
    var proposta = req.body.proposta;

    if (!proposta || Object.keys(proposta).length == 0 || proposta.proponente === undefined || proposta.carte_proposte === undefined) {
        res.status(400).send("Campi assenti.");
        return;
    }

    console.log("Ricevuta richiesta di accept proposta: ");
    console.log(offer_id);
    console.log(proposta);
    console.log();

    acceptProposta(res, offer_id, proposta);
});

async function acceptProposta(res, offer_id, proposta) {
    if (!proposta) {
        res.status(400).send("Campi assenti per la request: proposta");
        return;
    }

    var conn = await mongoClient.connect();
    var session = conn.startSession();
    session.startTransaction();

    try {
        //recupera offerta
        console.log("Recupero offerta: ");
        var offerta = await conn.db("AFSE").collection("Offers").findOne({ _id: ObjectId.createFromHexString(offer_id) });
        console.log(offerta);
        if (offerta === null) {
            await session.abortTransaction();
            console.log("Offerta non trovata.\n");
            res.status(404).send("Offerta non trovata.");
            return;
        }

        //delete dell'offerta dalla collection delle offerte
        console.log("Delete offerta: ");
        var deleted1 = await conn.db("AFSE").collection("Offers").deleteOne({ _id: ObjectId.createFromHexString(offer_id) }, { session });
        console.log(deleted1);
        if (deleted1.deletedCount === 0) {
            await session.abortTransaction();
            console.log("Offerta non trovata durante la cancellazione dell'offerta.\n");
            res.status(404).send("Offerta non trovata durante la cancellazione dell'offerta.");
            return;
        }

        //delete dell'offerta dal documento dell'utente offerente
        console.log("Delete offerta da user: ");
        var deleted2 = await conn.db("AFSE").collection("Users").updateOne(
            { _id: ObjectId.createFromHexString(offerta.offerente) },
            { $pull: { carte_da_scambiare: { _id: ObjectId.createFromHexString(offer_id) } } },
            { session }
        );
        console.log(deleted2);
        if (deleted2.modifiedCount === 0) {
            await session.abortTransaction();
            console.log("Offerta non trovata durante la cancellazione dell'offerta dal documento dell'utente offerente.\n");
            res.status(404).send("Offerta non trovata durante la cancellazione dell'offerta dal documento dell'utente offerente.");
            return;
        }

        //delete di tutte le proposte all'offerta
        console.log("Delete proposte...");
        for (const proposta of offerta.offerte_ricevute) {
            var id_carte_proposte = proposta.carte_proposte.map(c => c.id);
            var updated = await conn.db("AFSE").collection("Users").updateMany(
                { _id: ObjectId.createFromHexString(proposta.proponente) },
                { $inc: { "album.$[card].quantita": 1 } },
                { 
                    arrayFilters: [ { "card.id": { $in: id_carte_proposte } } ],
                    session
                }
            );

            if (updated.modifiedCount === 0) {
                await session.abortTransaction();
                console.log("E' stato riscontrato un problema durante la restituzione delle carte delle altre proposte.\n");
                res.status(404).send("E' stato riscontrato un problema durante la restituzione delle carte delle altre proposte.");
                return;
            }
        }

        //incrementa la quantità delle carte proposte e decrementa la quantità delle carte offerte all'utente offerente
        console.log("Update album utente offerente: ");
        console.log("Incremento delle carte proposte: ");
        var id_carte_offerte = offerta.carte_offerte.map(c => c.id);
        var id_carte_proposte = proposta.carte_proposte.map(c => c.id);
        
        //incrementa carte proposte ad offerente
        for (let card of proposta.carte_proposte) {
            //controlla se la carta è già presente nell'album dell'utente offerente
            var found = await conn.db("AFSE").collection("Users").findOne({ _id: ObjectId.createFromHexString(offerta.offerente), "album.id": card.id }, { session });
            
            if (found) {
                //incrementa la quantità della carta
                var updated1 = await conn.db("AFSE").collection("Users").updateOne(
                    { _id: ObjectId.createFromHexString(offerta.offerente), "album.id": card.id },
                    { $inc: { "album.$.quantita": 1 } },
                    { session }
                );
                
            } else {
                card.quantita = 1;
                //aggiungi la carta all'album dell'utente offerente
                var updated1 = await conn.db("AFSE").collection("Users").updateOne(
                    { _id: ObjectId.createFromHexString(offerta.offerente) },
                    { $push: { album: card } },
                    { session }
                );
                
            }

            console.log(updated1);

            if (updated1.modifiedCount === 0) {
                await session.abortTransaction();
                console.log("E' stato riscontrato un problema durante l'aggiornamento dell'album dell'utente offerente.\n");
                res.status(404).send("E' stato riscontrato un problema durante l'aggiornamento dell'album dell'utente offerente.");
                return;
            }
        }

        //decrementa carte offerte da offerente non necessario: sono già state rimosse con il post dell'offerta

        //incrementa la quantità delle carte offerte e decrementa la quantità delle carte proposte all'utente proponente
        console.log("Update album utente proponente: ");
        //incrementa carte offerte al proponente
        for (let card of offerta.carte_offerte) {
            //controlla se la carta è già presente nell'album dell'utente proponente
            var found = await conn.db("AFSE").collection("Users").findOne({ _id: ObjectId.createFromHexString(proposta.proponente), "album.id": card.id }, { session });
            
            if (found) {
                //incrementa la quantità della carta
                var updated3 = await conn.db("AFSE").collection("Users").updateOne(
                    { _id: ObjectId.createFromHexString(proposta.proponente), "album.id": card.id },
                    { $inc: { "album.$.quantita": 1 } },
                    { session }
                );
            } else {
                card.quantita = 1;
                //aggiungi la carta all'album dell'utente proponente
                var updated3 = await conn.db("AFSE").collection("Users").updateOne(
                    { _id: ObjectId.createFromHexString(proposta.proponente) },
                    { $push: { album: card } },
                    { session }
                );
            }

            if (updated3.modifiedCount === 0) {
                await session.abortTransaction();
                console.log("E' stato riscontrato un problema durante l'aggiornamento dell'album dell'utente proponente.\n");
                res.status(404).send("E' stato riscontrato un problema durante l'aggiornamento dell'album dell'utente proponente.");
                return;
            }
        }

        //decrementa carte proposte da proponente non necessario: sono già state rimosse con il post della proposta

        await session.commitTransaction();
        console.log("Transazione completata con successo.\n");
        res.status(200).send("Proposta accettata con successo.");

    } catch (e) {
        await session.abortTransaction();
        console.log("Problema nella transazione per l'accettazione della proposta.\n");
        res.status(500).send("Transazione abortita: " + e.code);
        return;
    } finally {
        await session.endSession();
        await conn.close();
    }
}

app.delete('/offers/:id', async function(req, res) {
    var offer_id = req.params.id;

    console.log("Ricevuta richiesta di delete offerta: ");
    console.log(offer_id);

    deleteOfferta(res, offer_id);
});

async function deleteOfferta(res, offer_id) {
    var conn = await mongoClient.connect();
    var session = conn.startSession();
    session.startTransaction();

    try {

        //recupera offerta
        var offerta = await conn.db("AFSE").collection("Offers").findOne({ _id: ObjectId.createFromHexString(offer_id) });
        if (offerta === null) {
            res.status(404).send("Offerta non trovata.");
            return;
        }

        //elimina offerta dalla collection delle offerte
        var deleted1 = await conn.db("AFSE").collection("Offers").deleteOne({ _id: ObjectId.createFromHexString(offer_id) }, { session: session });
        console.log("Delete offerta: ");
        console.log(deleted1);
        console.log();

        //elimina offerta dal documento dell'utente
        var deleted2 = await conn.db("AFSE").collection("Users").updateOne(
            { _id: ObjectId.createFromHexString(offerta.offerente) },
            { $pull: { carte_da_scambiare: { _id: ObjectId.createFromHexString(offer_id) } } },
            { session: session }
        );
        console.log("Delete offerta da user: ");
        console.log(deleted2);
        console.log();

        //elimina proposte all'offerta: restituisci le carte ai proponenti
        var proposte = offerta.offerte_ricevute;
        for (const proposta of proposte) {
            var id_carte_proposte = proposta.carte_proposte.map(c => c.id);
            var updated = await conn.db("AFSE").collection("Users").updateMany(
                { _id: ObjectId.createFromHexString(proposta.proponente) },
                { $inc: { "album.$[card].quantita": 1 } },
                { 
                    arrayFilters: [ { "card.id": { $in: id_carte_proposte } } ],
                    session: session 
                }
            );

            console.log("Update carte proposte: ");
            console.log(updated);
            console.log();
        }

        //incrementa la quantità delle carte offerte
        var id_carte_offerte = offerta.carte_offerte.map(c => c.id);
        var update1 = await conn.db("AFSE").collection("Users").updateMany(
            { _id: ObjectId.createFromHexString(offerta.offerente)},
            { $inc: { "album.$[card].quantita": 1 } },
            { 
                arrayFilters: [ { "card.id": { $in: id_carte_offerte } } ],
                session: session 
            }
        );

        console.log("Update carte offerte: ");
        console.log(update1);
        console.log();

        await session.commitTransaction();
        res.status(200).send(deleted1);

    } catch (e) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.log("Problema nella cancellazione dell'offerta. Transazione abortita.");
        console.log();
        res.status(400).send("Errore nella cancellazione dell'offerta. Dettagli: " + e);
    } finally {
        session.endSession();
        conn.close();
    }
}

app.post('/users/:id/offerte', async function(req, res) {
    /* #swagger.requestBody = {
            required: true,
            description: "Aggiungi una offerta di scambio alla lista delle offerte di scambio di un utente.",
            content: {
                "application/json": {
                    schema: { $ref: "#/components/schemas/offerSchema" },
                }
            }
        }
    */
    var id = req.params.id;
    var offerta = req.body;
    console.log("Ricevuta richiesta di aggiunta offerta ad utente: ");
    console.log(offerta);
    console.log();

    addOfferta(res, id, offerta);
});

async function addOfferta(res, id, offerta) {
    var conn = await mongoClient.connect();

    if (id === undefined || offerta === undefined || offerta.carta_offerta === undefined || offerta.offerente === undefined) {
        res.status(400).send("Campi assenti.");
        return;
    }

    try {
        var inserted = await conn.db("AFSE").collection("Users").updateOne(
            { _id: ObjectId.createFromHexString(id) }, 
            { $push: { carte_da_scambiare: offerta } 
        });
        console.log("Insert: ");
        console.log(inserted);
        console.log();
        res.status(201).send(inserted);
    } catch (e) {
        res.status(500).send("Errore interno generico: " + e.code);
    } finally {
        await conn.close();
    }

    return;
}

app.delete('/users/:user_id/offerte/:offer_id', (req, res) => {
    var user_id = req.params.user_id;
    var offer_id = req.params.offer_id;

    console.log("Ricevuta richiesta di delete offerta: ");
    console.log(user_id);
    console.log(offer_id);
    console.log();

    deleteOfferFromUser(res, user_id, offer_id);
});

async function deleteOfferFromUser(res, user_id, offer_id) {
    var conn = await mongoClient.connect();

    try {
        var updated = await conn.db("AFSE").collection("Users").updateOne(
            { _id: ObjectId.createFromHexString(user_id) }, 
            { $pull: { carte_da_scambiare: { _id: offer_id } } }
        );

        if (updated.modifiedCount === 0) {
            res.status(404).send("Offerta non trovata.");
        } else {
            console.log("Delete:");
            console.log(updated);
            console.log();
            res.status(200).send("Offerta cancellata con successo.");
        }
    } catch (e) {
        res.status(500).send("Errore interno generico: " + e.code);
    } finally {
        await conn.close();
    }
} 

app.post('/login', async function(req, res) {
    var user = req.body;

    console.log("Ricevuta richiesta di login da: ");
    console.log(user);
    console.log();

    if (user.email === undefined || user.password === undefined) {
        res.status(400).send("Campi assenti.");
        return;
    }

    user.password = md5(user.password)
    var conn = await mongoClient.connect();
    try {
        var found = await conn.db("AFSE").collection("Users").findOne(user);
        if (found === null) {
            res.status(404).send("Utente non trovato.");
        } else {
            res.status(200).send(found);
        }
    } catch (e) {
        res.status(500).send("Errore interno generico: " + e.code);
    } finally { 
        await conn.close();
    }
});

app.get('/marvel-characters', (req, res) => {
    console.log("Ricevuta query per personaggi: ");
    console.log(req.query);
    console.log();

    var limit = req.query.limit || 24;
    var page = req.query.page || 1;
    var offset = limit * page;

    fetch(`https://gateway.marvel.com:443/v1/public/characters?apikey=${public_apikey}&ts=${ts}&hash=${hash}&limit=${limit}&offset=${offset}`)
    .then(response => response.json())
    .then(data => res.json(data))
    .catch(error => {
        console.error('Error fetching data from Marvel API:', error);
        res.status(500).json({ error: 'Errore da server Marvel API' });
    });
    
});

app.get('/marvel-characters/:id', (req, res) => {
    console.log("Ricevuta richiesta per personaggio: " + req.params.id);
    console.log();
    var id = req.params.id;

    fetch(`https://gateway.marvel.com:443/v1/public/characters/${id}?apikey=${public_apikey}&ts=${ts}&hash=${hash}`)
    .then(response => response.json())
    .then(data => res.json(data))
    .catch(error => {
        console.error('Error fetching data from Marvel API:', error);
        res.status(500).json({ error: 'Errore da server Marvel API' });
    });
    
});

app.get('/marvel-characters/:id/comics', (req, res) => {
    console.log("Ricevuta richiesta per comics del personaggio: " + req.params.id);
    console.log();
    var id = req.params.id;

    fetch(`https://gateway.marvel.com:443/v1/public/characters/${id}/comics?apikey=${public_apikey}&ts=${ts}&hash=${hash}`)
    .then(response => response.json())
    .then(data => res.json(data))
    .catch(error => {
        console.error('Error fetching comics from Marvel API:', error);
        res.status(500).json({ error: 'Errore da server Marvel API' });
    });
    
});

app.get('/marvel-characters/:id/series', (req, res) => {
    console.log("Ricevuta richiesta per serie del personaggio: " + req.params.id);
    console.log();
    var id = req.params.id;

    fetch(`https://gateway.marvel.com:443/v1/public/characters/${id}/series?apikey=${public_apikey}&ts=${ts}&hash=${hash}`)
    .then(response => response.json())
    .then(data => res.json(data))
    .catch(error => {
        console.error('Error fetching series from Marvel API:', error);
        res.status(500).json({ error: 'Errore da server Marvel API' });
    });
    
});

app.get('/marvel-characters/:id/events', (req, res) => {
    console.log("Ricevuta richiesta per eventi del personaggio: " + req.params.id);
    console.log();
    var id = req.params.id;

    fetch(`https://gateway.marvel.com:443/v1/public/characters/${id}/events?apikey=${public_apikey}&ts=${ts}&hash=${hash}`)
    .then(response => response.json())
    .then(data => res.json(data))
    .catch(error => {
        console.error('Error fetching events from Marvel API:', error);
        res.status(500).json({ error: 'Errore da server Marvel API' });
    });
    
});

app.get('/random-character', (req, res) => {
    var limit = 1;
    var offset = Math.floor(Math.random() * 1564);

    console.log("Ricevuta richiesta per personaggio casuale con offset: " + offset);

    getRandomCharacter(res, limit, offset);

    console.log();
});

async function getRandomCharacter(res, limit, offset) {

    fetch(`https://gateway.marvel.com:443/v1/public/characters?apikey=${public_apikey}&ts=${ts}&hash=${hash}&limit=${limit}&offset=${offset}`)
    .then(response => response.json())
    .then(data => getOrCreateCard(res, data.data.results[0]))
    .catch(error => {
        console.error('Errore nel recuperare il personaggio casuale dall\'API Marvel: ', error);
        //retry
        getRandomCharacter(res);
    });
}

async function getOrCreateCard(res, character) {
    var conn = await mongoClient.connect();
    try {
        var found = await conn.db("AFSE").collection("Cards").findOne({ id: character.id });
        
        if (found) {
            console.log("Found:");
            console.log(found);
            res.status(200).send(found);
            return;
        } else {
            var inserted = await insertCard(character);
            console.log("Insert:");
            console.log(inserted);
            
            if (inserted instanceof Error) {
                res.status(500).send("Errore interno generico: " + inserted.code);
                return;
            } else {
                res.status(201).send(inserted);
                return;
            }
        }

    } catch (e) {
        res.status(500).send("Errore nel reperimento della card: " + e.code);
    } finally {
        await conn.close();
    }
}

async function insertCard(character) {
    var conn = await mongoClient.connect();
    try {
        var card = {
            id: character.id,
            name: character.name,
            description: character.description,
            thumbnail: character.thumbnail.path + "." + character.thumbnail.extension
        }

        var inserted = await conn.db("AFSE").collection("Cards").insertOne(card);
        if (inserted.acknowledged === true) {
            return card;
        } else {
            return new Error("Errore nell'inserimento della carta.");
        }

    } catch (e) {
        return e;
    } finally {
        await conn.close();
    }
}

app.get('/packs', async function(req, res) {
    console.log("Ricevuta richiesta di pacchetti.");

    getPacchetti(res);
});

async function getPacchetti(res) {
    var conn = await mongoClient.connect();
    try {
        var packs = await conn.db("AFSE").collection("Packs").find().toArray();

        if (packs.length === 0) {
            res.status(404).send("Nessun pacchetto trovato.");
        }
        
        res.status(200).send(packs);
    } catch (e) {
        res.status(500).send("Errore interno generico: " + e.code);
    } finally {
        await conn.close();
    }
}

app.post('/packs', async function(req, res) {
    /* #swagger.requestBody = {
            required: true,
            description: "Aggiungi un pacchetto di carte da vendere agli utenti.",
            content: {
                "application/json": {
                    schema: { $ref: "#/components/schemas/packSchema" },
                }
            }
        }
    */
    var pack = req.body;
    console.log("Ricevuta richiesta di creazione pack: ");
    console.log(pack);
    console.log();

    creaPacchetto(res, pack);
});

async function creaPacchetto(res, pack) {
    var conn = await mongoClient.connect();

    try {
        var inserted = await conn.db("AFSE").collection("Packs").insertOne(pack);

        if (inserted.acknowledged === true) {
            res.status(201).send(inserted);
        } else {
            res.status(500).json({ error: "Errore nell'inserimento del pacchetto." });
        }
    } catch (e) {
        res.status(500).json({ error: "Errore interno generico: " + e.code });
    } finally {
        await conn.close();
    }
}

//test per vedere come funzionano le transazioni
/* app.post('/test', testTransazioni);

async function testTransazioni(req, res) {
    var conn = await mongoClient.connect();
    var session = conn.startSession();
    session.startTransaction();
    try {
        var inserted = await conn.db("test").collection("One").insertOne({ test: "test on One" }, { session: session });
        console.log("Insert: " + inserted);
        var inserted2 = await conn.db("test").collection("Two").insertOne({ _id: ObjectId.createFromHexString("66c611b2e6cee3877a7c9a87"), test: "test on Two" }, { session: session });
        console.log("Insert2: " + inserted2);
        session.commitTransaction();
        res.status(200).send("Transazione completata con successo. Inserted: " + inserted + " Inserted2: " + inserted2);
    } catch (e) {
        session.abortTransaction();
        res.status(500).send("Transazione abortita: " + e.code);
    } finally {
        session.endSession();
        await conn.close();
    }
} */

app.listen(port, function() {
    console.log('Server in ascolto su porta: ' + port);
});