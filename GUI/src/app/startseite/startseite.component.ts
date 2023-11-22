import {AfterViewInit, Component, OnInit} from '@angular/core';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatButtonModule} from '@angular/material/button';
import {FormsModule} from "@angular/forms";
import {StartseiteRoutingModule} from "./startseite-routing.module";
import {Client} from "../models/client";
import {KeyManagementService} from "../services/management/key-management.service";
import {createConfigurationDataFrom} from "../models/configuration-data";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ConfigurationManagementService} from "../services/management/configuration-management.service";
import {ClientService} from "../services/management/client.service";
import {NgForOf} from "@angular/common";
import {MatIconModule} from "@angular/material/icon";
import {MatDialog, MatDialogRef} from "@angular/material/dialog";
import {SimpleDialogComponent} from "../simple-dialog/simple-dialog.component";
import {LoadingDialogComponent} from "../loading-dialog/loading-dialog.component";


@Component({
  selector: 'app-startseite',
  standalone: true,
  imports: [
    StartseiteRoutingModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule,
    NgForOf,
    MatIconModule,
  ],
  templateUrl: './startseite.component.html',
  styleUrl: './startseite.component.scss'
})
/**
 * Komponente für die Darstellung der Startseite inklusive der Konfigurationsmöglichkeiten.
 */
export class StartseiteComponent implements AfterViewInit {

  /**
   * Ein notwendiger Zwischenspeicher für die öffentlichen Komponenten der Schlüssel.
   * Ohne dies wäre eine dynamische Aktualisierung der Schlüssel nicht möglich.
   */
  clientKeys: Map<Client, { modulus: string, exponent: string }> = new Map();

  /**
   * Registriert sich bei dem KeyService, um die öffentlichen Komponenten der Schlüssel bereitstellen zu können.
   */
  ngAfterViewInit(): void {
    const clients = this.getClients();

    clients.forEach(client => {
      this.subscribeToClientKeys(client);
    });
  }

  private subscribeToClientKeys(client: Client) {
    this.keyService.getObservable(client).subscribe(keyPair => {
      console.log("Startseite: KeyPair for " + client.name + " updated.");
      this.clientKeys.set(client, {
        modulus: keyPair.modulus,
        exponent: keyPair.e
      });
    });
  }

  constructor(private keyService: KeyManagementService,
              private configurationService: ConfigurationManagementService,
              private clientService: ClientService,
              public dialog: MatDialog,
              private snackBar: MatSnackBar) {
  }

  /**
   * Generiert ein Schlüsselpaar für den Client.
   */
  public generateKeys(client: Client) {

    let loadingDialog = this.openLoadDialog();

    let requestContent = createConfigurationDataFrom(
      this.modulusWidth,
      this.millerRabinIterations,
      this.randomSeed,
      this.numberSystem
    )
    this.keyService.generateKeyPair(requestContent, client).subscribe({
      next: () => {
        loadingDialog.close()
        this.showSnackbar("Schlüsselpaar für " + client.name + " generiert.");
      }
    });
  }

  /**
   * Öffnet den Laden-Dialog.
   */
  public openLoadDialog(): MatDialogRef<LoadingDialogComponent> {
    return this.dialog.open(LoadingDialogComponent, {
      disableClose: true // Verhindert das Schließen durch den Benutzer
    });
  }

  /**
   * Zeigt eine Snackbar mit der gegebenen Nachricht an.
   */
  private showSnackbar(message: string) {
    this.snackBar.open(message, "Ok", {
      duration: 4000,
    })
  }

  public set modulusWidth(value: number) {
    this.configurationService.setModulusWidth(value);
  }

  public get modulusWidth(): number {
    return this.configurationService.getModulbreite();
  }

  public set numberSystem(value: number) {
    this.configurationService.setNumberSystem(value);
  }

  public get numberSystem(): number {
    return this.configurationService.getNumberSystem();
  }

  public set randomSeed(value: number) {
    this.configurationService.setRandomSeed(value);
  }

  public get randomSeed(): number {
    return this.configurationService.getRandomSeed();
  }

  public set millerRabinIterations(value: number) {
    this.configurationService.setMillerRabinIterations(value);
  }

  public get millerRabinIterations(): number {
    return this.configurationService.getMillerRabinIterations();
  }

  public getModulus(client: Client): string {
    return this.clientKeys.get(client)?.modulus || '';
  }

  public setModulus(client: Client, value: string): void {
    const keyPair = this.clientKeys.get(client);
    if (keyPair) {
      keyPair.modulus = value;
      this.keyService.setModul(client, value);
      this.keyService.updateClient(client);
    }
  }

  public getExponent(client: Client): string {
    return this.clientKeys.get(client)?.exponent || '';
  }

  public setExponent(client: Client, value: string): void {
    const keyPair = this.clientKeys.get(client);
    if (keyPair) {
      keyPair.exponent = value;
      this.keyService.setE(client, value);
      this.keyService.updateClient(client);
    }
  }

  /**
   * Gibt den BindingContext für die Schlüsselverwaltung dynamischer Clients zurück.
   */
  public getBindingContext(client: Client) {
    const component = this;
    return {
      get modulus(): string {
        return component.getModulus(client);
      },
      set modulus(value) {
        component.setModulus(client, value);
      },
      get exponent(): string {
        return component.getExponent(client);
      },
      set exponent(value) {
        component.setExponent(client, value);
      },
    };
  }

  /**
   * Öffnet einen Dialog, um einen neuen Client zu erstellen.
   */
  public openNameInputDialog(): void {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      data: {name: "", aborted: false},
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result.aborted) {
        return;
      }
      let newClient = this.clientService.createAndRegisterClient(result.name);
      this.subscribeToClientKeys(newClient);
    });
  }

  public getClients(): Set<Client> {
    return this.clientService.getClients();
  }

  /**
   * Löscht einen Client und entfernt alle Registrierungen.
   */
  public deleteClient(client: Client) {
    this.clientService.deleteAndUnregisterClient(client);
  }
}