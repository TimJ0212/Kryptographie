import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {Client} from "../models/client";
import {KeyManagementService} from "../services/management/key-management.service";
import {MessageManagementService} from "../services/management/message-management.service";
import {MatIconModule} from "@angular/material/icon";
import {MatSnackBar} from "@angular/material/snack-bar";
import {BackendRequestService} from "../services/backend-api/backend-request.service";
import {createEncryptDecryptRequestFrom} from "../models/encrypt-decrypt-request";
import {ConfigurationManagementService} from "../services/management/configuration-management.service";
import {signRequestFrom} from "../models/sign-request";
import {verifyRequestFrom} from "../models/verify-request";
import {ActivatedRoute} from "@angular/router";
import {ClientService} from "../services/management/client.service";
import {MatSelectModule} from "@angular/material/select";
import {MatCardModule} from "@angular/material/card";
import {MatMenuModule} from "@angular/material/menu";

@Component({
    selector: 'client',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatExpansionModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatSelectModule,
        MatCardModule,
        MatMenuModule
    ],
    templateUrl: './client.component.html',
    styleUrl: './client.component.scss'
})
/**
 * Komponente für die Darstellung eines Clients.
 * Diese ist die Basis für die Darstellung von Alice, Bob und möglichen Weiteren.
 */
export class ClientComponent implements OnInit {

    /**
     * Der Client, für den die Komponente dargestellt wird.
     */
    private _client: Client | undefined;

    public signatureVerificationCalculated: boolean = false;
    public signatureValid: boolean = false;

    public get client(): Client {
        if (!this._client) {
            throw new Error("Client is undefined!");
        }
        return this._client;
    }

    public set client(value: Client) {
        this._client = value;
    }

    public get sendingTo(): Client {
        if (!this.client) {
            throw new Error("Client is undefined!");
        }
        if (!this.client.sendingTo) {
            throw new Error("SendingTo is undefined!");
        }
        return this.client.sendingTo;
    }

    public set sendingTo(value: Client) {
        if (!this.client) {
            throw new Error("Client is undefined!");
        }
        this.client.sendingTo = value;
    }

    public get receivedFrom(): Client {
        if (!this.client) {
            throw new Error("Client is undefined!");
        }
        if (!this.client.receivedFrom) {
            throw new Error("ReceivedFrom is undefined!");
        }
        return this.client.receivedFrom;
    }

    public receivedFromIsSet(): boolean {
        if (!this.client) {
            throw new Error("Client is undefined!");
        }
        if (this.client.receivedFrom) {
            console.log("Received from is set: " + this.client.receivedFrom.name);
            return true;
        }
        console.log("Received from is not set");
        return false;
    }

    /**
     * Konstruktor der Komponente.
     */
    constructor(private keyService: KeyManagementService,
                private messageService: MessageManagementService,
                private backendRequestService: BackendRequestService,
                private configurationService: ConfigurationManagementService,
                private clientService: ClientService,
                private route: ActivatedRoute,
                private snackBar: MatSnackBar) {
    }

    /**
     * Registriert die Komponente bei den Services, um über Änderungen informiert zu werden.
     */
    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            const name = params.get("client");
            console.log("OnInit in Client with name " + name);
            if (name) {
                this.client = this.clientService.getClientByName(name);
                this.sendingTo = this.getOtherClients().values().next().value;
                console.log(this.client)
            } else {
                console.error("Client name is null! Invalid path");
                return;
            }
        });

        this.keyService.getObservable(this.client!).subscribe(keyPair => {
            this.privateExponent = keyPair.d;
            this.modulus = keyPair.modulus;
        });
        this.messageService.getObservable(this.client!).subscribe(message => {
            // Werden die Nachrichten neu gesetzt, muss die Signatur neu berechnet werden.
            this.signatureVerificationCalculated = false;
            this.cipherText = message.ciphertext;
            this.plainText = message.plaintext;
            this.signature = message.signature;
        });
    }

    /**
     * Zeigt eine Snackbar mit der übergebenen Nachricht an.
     * @param message
     * @private
     */
    private showSnackbar(message: string) {
        this.snackBar.open(message, "Ok", {
            duration: 4000,
        })
    }

    /**
     * Verschlüsselt die Nachricht.
     */
    public encrypt() {
        const requestBody = createEncryptDecryptRequestFrom(
            this.plainText,
            this.keyService.getKeyPair(this.sendingTo),
            this.configurationService.getNumberSystem()
        );
        this.backendRequestService.encrypt(requestBody).then(r => {
            this.messageService.setCiphertext(r.message, this.client);
            this.showSnackbar("Nachricht verschlüsselt!");
        })
    }

    /**
     * Entschlüsselt die Nachricht.
     */
    public decrypt() {
        const requestBody = createEncryptDecryptRequestFrom(
            this.cipherText,
            this.keyService.getKeyPair(this.client),
            this.configurationService.getNumberSystem()
        );
        this.backendRequestService.decrypt(requestBody).then(r => {
            this.messageService.setPlaintext(r.message, this.client);
            this.showSnackbar("Nachricht entschlüsselt!");
        })
    }

    /**
     * Berechnet die Signatur des Klartextes.
     */
    public signPlaintext() {
        const requestBody = signRequestFrom(
            this.plainText,
            this.keyService.getKeyPair(this.client),
        );
        this.backendRequestService.sign(requestBody).then(r => {
            this.messageService.setSignature(r.message, this.client);
            this.showSnackbar("Signatur berechnet!");
        })
    }

    /**
     * Berechnet die Signatur des Chiffrats.
     */
    public signCiphertext() {
        const requestBody = signRequestFrom(
            this.cipherText,
            this.keyService.getKeyPair(this.client),
        );
        this.backendRequestService.sign(requestBody).then(r => {
            this.messageService.setSignature(r.message, this.client);
            this.showSnackbar("Signatur berechnet!");
        })
    }

    /**
     * Verifiziert die Signatur des Klartextes.
     */
    public verifyPlaintext() {
        const requestBody = verifyRequestFrom(
            this.plainText,
            this.signature,
            this.keyService.getKeyPair(this.receivedFrom),
        );
        this.backendRequestService.verify(requestBody).then(r => {
            let verified = r.message === "true";
            this.signatureVerificationCalculated = true;
            this.signatureValid = verified;
            this.showSnackbar("Signatur verifiziert!");
        })
    }

    /**
     * Verifiziert die Signatur des Chiffrats.
     */
    public verifyCiphertext() {
        const requestBody = verifyRequestFrom(
            this.cipherText,
            this.signature,
            this.keyService.getKeyPair(this.receivedFrom),
        );
        this.backendRequestService.verify(requestBody).then(r => {
            let verified = r.message === "true";
            this.signatureVerificationCalculated = true;
            this.signatureValid = verified;
            this.showSnackbar("Signatur verifiziert!");
        })
    }

    /**
     * Sendet die verschlüsselte Nachricht und die Signatur an den anderen Client.
     * Setzt anschließend die Nachrichten- und Signaturfelder zurück.
     */
    public sendCiphertextAndSignature() {
        console.log("Sending message and signature from " + this.client?.name + " to " + this.sendingTo.name + "");
        this.messageService.setCiphertext(this.cipherText, this.sendingTo);
        this.messageService.setSignature(this.signature, this.sendingTo);
        this.sendingTo.receivedFrom = this.client;
        this.showSnackbar("Nachricht und Signatur gesendet!");

        // Alle Felder leeren, wenn gesendet wird
        this.clearFields();
        this.clearSignatureFields();
    }

    public sendPlaintextAndSignature() {
        console.log("Sending message and signature from " + this.client?.name + " to " + this.sendingTo.name + "");
        this.messageService.setPlaintext(this.plainText, this.sendingTo);
        this.messageService.setSignature(this.signature, this.sendingTo);
        this.sendingTo.receivedFrom = this.client;
        this.showSnackbar("Nachricht und Signatur gesendet!");

        // Alle Felder leeren, wenn gesendet wird
        this.clearFields();
        this.clearSignatureFields();
    }

    public isCiphertextEmpty(): boolean {
        return this.cipherText === "";
    }

    /**
     * Setzt die Nachrichtenfelder zurück.
     */
    public clearFields() {
        this.messageService.setPlaintext("", this.client)
        this.messageService.setCiphertext("", this.client);
    }

    /**
     * Setzt die Signaturfelder zurück.
     */
    public clearSignatureFields() {
        this.messageService.setSignature("", this.client);
        this.signatureVerificationCalculated = false;
        this.signatureValid = false;
    }

    public get cipherText(): string {
        return this.messageService.getCiphertext(this.client);
    }

    public set cipherText(value: string) {
        this.messageService.setCiphertext(value, this.client);
    }

    public get plainText(): string {
        return this.messageService.getPlaintext(this.client);
    }

    public set plainText(value: string) {
        this.messageService.setPlaintext(value, this.client);
    }

    public get signature(): string {
        return this.messageService.getSignature(this.client);
    }

    public set signature(value: string) {
        this.messageService.setSignature(value, this.client);
    }

    public get privateExponent(): string {
        return this.keyService.getD(this.client);
    }

    public set privateExponent(value: string) {
        this.keyService.setD(this.client, value);
    }

    public get modulus(): string {
        return this.keyService.getModul(this.client);
    }

    public set modulus(value: string) {
        this.keyService.setModul(this.client, value);
    }

    /**
     * Gibt alle Clients außer dem "eigenen" zurück.
     */
    public getOtherClients(): Set<Client> {
        const allClients = this.clientService.getClients();
        return new Set(
            [...allClients].filter(clientFromSet => clientFromSet !== this.client)
        );
    }

    signFieldIsNotEmpty() {
        return this.signature !== "";
    }
}
