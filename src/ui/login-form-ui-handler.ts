import { FormModalUiHandler, InputFieldConfig } from "./form-modal-ui-handler";
import { ModalConfig } from "./modal-ui-handler";
import * as Utils from "../utils";
import { Mode } from "./ui";
import i18next from "i18next";
import BattleScene from "#app/battle-scene";

export default class LoginFormUiHandler extends FormModalUiHandler {
  private readonly ERR_USERNAME: string = "invalid username";
  private readonly ERR_PASSWORD: string = "invalid password";
  private readonly ERR_ACCOUNT_EXIST: string = "account doesn't exist";
  private readonly ERR_PASSWORD_MATCH: string = "password doesn't match";
  private readonly ERR_NO_SAVES: string = "No save files found";
  private readonly ERR_TOO_MANY_SAVES: string = "Too many save files found";

  constructor(scene: BattleScene, mode: Mode | null = null) {
    super(scene, mode);
  }

  setup(): void {
    super.setup();
  }

  override getModalTitle(_config?: ModalConfig): string {
    return i18next.t("menu:login");
  }

  override getWidth(_config?: ModalConfig): number {
    return 160;
  }

  override getMargin(_config?: ModalConfig): [number, number, number, number] {
    return [ 0, 0, 48, 0 ];
  }

  override getButtonLabels(_config?: ModalConfig): string[] {
    return [ i18next.t("menu:login")  ];
  }

  override getReadableErrorMessage(error: string): string {
    const colonIndex = error?.indexOf(":");
    if (colonIndex > 0) {
      error = error.slice(0, colonIndex);
    }
    switch (error) {
      case this.ERR_USERNAME:
        return i18next.t("menu:invalidLoginUsername");
      case this.ERR_PASSWORD:
        return i18next.t("menu:invalidLoginPassword");
      case this.ERR_ACCOUNT_EXIST:
        return i18next.t("menu:accountNonExistent");
      case this.ERR_PASSWORD_MATCH:
        return i18next.t("menu:unmatchingPassword");
      case this.ERR_NO_SAVES:
        return "P01: " + i18next.t("menu:noSaves");
      case this.ERR_TOO_MANY_SAVES:
        return "P02: " + i18next.t("menu:tooManySaves");
    }

    return super.getReadableErrorMessage(error);
  }

  override getInputFieldConfigs(): InputFieldConfig[] {
    const inputFieldConfigs: InputFieldConfig[] = [];
    inputFieldConfigs.push({ label: i18next.t("menu:username") });
    inputFieldConfigs.push({ label: i18next.t("menu:password"), isPassword: true });
    return inputFieldConfigs;
  }

  override show(args: any[]): boolean {
    if (super.show(args)) {
      const config = args[0] as ModalConfig;
      const originalLoginAction = this.submitAction;
      this.submitAction = (_) => {
        // Prevent overlapping overrides on action modification
        this.submitAction = originalLoginAction;
        this.sanitizeInputs();
        this.scene.ui.setMode(Mode.LOADING, { buttonActions: []});
        const onFail = error => {
          this.scene.ui.setMode(Mode.LOGIN_FORM, Object.assign(config, { errorMessage: error?.trim() }));
          this.scene.ui.playError();
        };
        if (!this.inputs[0].text) {
          return onFail(i18next.t("menu:emptyUsername"));
        }
        Utils.apiPost("account/login", `username=${encodeURIComponent(this.inputs[0].text)}&password=${encodeURIComponent(this.inputs[1].text)}`, "application/x-www-form-urlencoded")
          .then(response => {
            if (!response.ok) {
              return response.text();
            }
            return response.json();
          })
          .then(response => {
            if (response.hasOwnProperty("token")) {
              Utils.setCookie(Utils.sessionIdKey, response.token);
              originalLoginAction && originalLoginAction();
            } else {
              onFail(response);
            }
          });
      };

      return true;
    }

    return false;
  }

  override clear() {
    super.clear();
  }
}
