import {Component} from "@angular/core";
import {AddClientButtonComponent} from "../shared/add-client-button/add-client-button.component";
import {MatAccordion} from "@angular/material/expansion";
import {MvBasicsPanelComponent} from "../menezes-vanstone/mv-basics-panel/mv-basics-panel.component";
import {MvClientPanelComponent} from "../menezes-vanstone/mv-client-panel/mv-client-panel.component";
import {
    MvConfigurationPanelComponent
} from "../menezes-vanstone/mv-configuration-panel/mv-configuration-panel.component";
import {NgForOf} from "@angular/common";
import {RsaBasicsPanelComponent} from "./rsa-basics-panel/rsa-basics-panel.component";
import {RsaConfigurationPanelComponent} from "./rsa-configuration-panel/rsa-configuration-panel.component";
import {RsaClientData} from "../shared/ClientData";
import {RsaConfigurationData} from "../shared/ConfigurationDataTypes";
import {RsaClientPanelComponent} from "./rsa-client-panel/rsa-client-panel.component";
import {AbstractAsymEncryptionComponent} from "../shared/AbstractAsymEncryptionComponent";
import {SimpleDialogComponent} from "../../dialogs/simple-dialog/simple-dialog.component";

@Component({
  selector: 'rsa',
  standalone: true,
    imports: [
        AddClientButtonComponent,
        MatAccordion,
        MvBasicsPanelComponent,
        MvClientPanelComponent,
        MvConfigurationPanelComponent,
        NgForOf,
        RsaBasicsPanelComponent,
        RsaConfigurationPanelComponent,
        RsaClientPanelComponent
    ],
  templateUrl: './rsa.component.html',
  styleUrl: './rsa.component.scss'
})
export class RsaComponent extends AbstractAsymEncryptionComponent<RsaConfigurationData, RsaClientData>{

    public config: RsaConfigurationData = RsaConfigurationData.createDefault();


    public clients: RsaClientData[] = [
        RsaClientData.createDefaultWithName("Alice"),
        RsaClientData.createDefaultWithName("Bob"),
    ];

    public openNameInputDialog(): void {
        const dialogRef = this.dialog.open(SimpleDialogComponent, {
            data: {name: "", aborted: false},
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result.aborted) {
                return;
            }
            const newClient = RsaClientData.createDefaultWithName(result.name);
            this.clients.push(newClient);
        });
    }
}
