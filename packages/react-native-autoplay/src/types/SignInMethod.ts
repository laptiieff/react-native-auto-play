export enum SignInMethods {
  QR = 0,
  GOOGLE = 1,
  PIN = 2,
  INPUT = 3,
}

export type GoogleSignInAccount = {
  serverAuthCode?: string;
  email?: string;
  id?: string;
  displayName?: string;
  photoUrl?: string;
  idToken?: string;
  givenName?: string;
  familyName?: string;
};

export type GoogleSignIn = {
  method: SignInMethods.GOOGLE;
  serverClientId: string;
  callback: (error?: string, signInAccount?: GoogleSignInAccount) => void;
};

export type PinSignIn = {
  method: SignInMethods.PIN;
  /**
   * PIN code for sign-in. Must be 1-12 characters.
   */
  pin: string;
};

export enum KeyboardType {
  DEFAULT = 0,
  EMAIL = 1,
  PHONE = 2,
  NUMBER = 3,
}
export enum TextInputType {
  PASSWORD = 0,
  DEFAULT = 1,
}
export type InputSignIn = {
  method: SignInMethods.INPUT;
  keyboardType?: KeyboardType;
  hint?: string;
  defaultValue?: string;
  errorMessage?: string;
  callback: (text: string) => void;
  showKeyboardByDefault?: boolean;
  inputType: TextInputType;
};
export type QrSignIn = {
  method: SignInMethods.QR;
  url: string;
};

export type SignInMethod = QrSignIn | PinSignIn | InputSignIn | GoogleSignIn;
