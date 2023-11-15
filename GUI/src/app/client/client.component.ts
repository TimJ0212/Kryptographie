import {Component, Input, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {ClientEnum} from "../models/client-enum";
import {KeyManagementService} from "../services/management/key-management.service";
import {MessageManagementService} from "../services/management/message-management.service";
import {MatIconModule} from "@angular/material/icon";
import {MatSnackBar} from "@angular/material/snack-bar";

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
    MatIconModule
  ],
  templateUrl: './client.component.html',
  styleUrl: './client.component.css'
})
export class ClientComponent implements OnInit {

  @Input() client: ClientEnum = ClientEnum.Alice;
  @Input() otherClient: ClientEnum = ClientEnum.Bob;
  public signatureVerified: boolean = false;
  public signatureValid: boolean = false;

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

  constructor(private keyService: KeyManagementService,
              private messageService: MessageManagementService,
              private snackBar: MatSnackBar) {
  }

  ngOnInit(): void {
    this.keyService.getObservableWithRegister(this.client).subscribe(keyPair => {
      this.privateExponent = keyPair.d;
      this.modulus = keyPair.modulus;
    });

    this.messageService.getObservableWithRegister(this.client).subscribe(message => {
      // Werden die Nachrichten neu gesetzt, muss die Signatur neu berechnet werden.
      this.signatureVerified = false;
      this.cipherText = message.ciphertext;
      this.plainText = message.plaintext;
      this.signature = message.signature;
    });
  }

  private showSnackbar(message: string) {
    this.snackBar.open(message, "Ok", {
      duration: 4000,
    })
  }

  public encrypt() {
    let ciphertext = this.plainText + " encrypted!"  //TODO Encrypt
    this.messageService.setCiphertext(ciphertext, this.client);
    this.showSnackbar("Nachricht verschlüsselt!");
  }

  public decrypt() {
    let plaintext = this.cipherText + " decrypted!"  //TODO Decrypt
    this.messageService.setPlaintext(plaintext, this.client);
    this.showSnackbar("Nachricht entschlüsselt!");
  }

  public clearFields() {
    this.messageService.setPlaintext("", this.client)
    this.messageService.setCiphertext("", this.client);
  }

  public sign() {
    let signature = this.plainText + " signed!"  //TODO Sign
    this.messageService.setSignature(signature, this.client);
    this.showSnackbar("Nachricht signiert!");
  }

  public verify() {
    this.signatureVerified = true;
    this.signatureValid = this.signatureVerified; //TODO Verify
    this.showSnackbar("Signatur verifiziert!");
  }

  /**
   * Sendet die verschlüsselte Nachricht und die Signatur an den anderen Client.
   * Leert anschließend die Nachrichtenfelder.
   */
  public sendMessageAndSignature() {
    this.messageService.setCiphertext(this.cipherText, this.otherClient);
    this.messageService.setSignature(this.signature, this.otherClient);
    this.showSnackbar("Nachricht und Signatur gesendet!");

    // Alle Felder leeren, wenn gesendet wird
    this.clearFields();
    this.clearSignatureFields();
  }

  public clearSignatureFields() {
    this.messageService.setSignature("", this.client);
    this.signatureVerified = false;
    this.signatureValid = false;
  }
}
