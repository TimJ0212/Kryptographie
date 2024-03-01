use bigdecimal::num_bigint::BigInt;

use crate::encryption::encryption_types::{Decryptor, EncryptionScheme, Encryptor};
use crate::encryption::string_schemes::decimal_unicode_schemes::decimal_unicode_conversion_core::ToRadixString;
use crate::encryption::string_schemes::decimal_unicode_schemes::keys::DecimalUnicodeConversionSchemeKey;
use crate::encryption::string_schemes::decimal_unicode_schemes::to_decimal_block_scheme::ToDecimalBlockScheme;
use crate::encryption::symmetric_encryption_types::{
    SymmetricDecryptor, SymmetricEncryptionScheme, SymmetricEncryptor,
};

/// Ein Verschlüsselungsschema, dass eine Menge von Dezimalzahlen in eine Zeichenkette umwandelt, indem die g-adische
/// Entwicklung der Zahlen gebildet wird. Dabei wird die Basis als obere Grenze des Unicode-Zeichensatzes interpretiert.
pub struct FromDecimalBlockScheme {}

impl EncryptionScheme for FromDecimalBlockScheme {}

impl SymmetricEncryptionScheme for FromDecimalBlockScheme {}

impl<'a> Encryptor<'a, FromDecimalBlockScheme> for FromDecimalBlockScheme {
    type Input = Vec<BigInt>;
    type Output = String;
    type Key = DecimalUnicodeConversionSchemeKey;
}

impl<'a> SymmetricEncryptor<'a, FromDecimalBlockScheme> for FromDecimalBlockScheme {
    /// Erzeugt einen String aus den gegebenen Dezimalzahlen, indem die g-adische Entwicklung der Zahlen gebildet wird.
    /// Dabei wird die Basis aus dem Schlüssel verwendet.
    /// Um die gegebene Blockgröße zu erreichen, wird der String mit führenden Unicode-Nullen aufgefüllt.
    /// Dies funktioniert, weil die Umkehrfunktion diese Nullen als neutral-additive Elemente interpretiert.
    ///
    /// # Arguments
    /// * `plaintext` - Die Dezimalzahlen, die verschlüsselt werden sollen.
    /// * `key` - Der Schlüssel, der die Basis und die Blockgröße enthält.
    ///
    /// # Returns
    /// Ein String, der die verschlüsselten Blöcke repräsentiert.
    fn encrypt(plaintext: &Self::Input, key: &Self::Key) -> Self::Output {
        assert!(key.radix > 0, "Die Basis muss größer als 0 sein.");
        assert!(key.block_size > 0, "Die Blockgröße muss größer als 0 sein.");

        let mut result = String::new();

        plaintext
            .iter()
            .map(|block| {
                let string = block.to_radix_string(&key.radix);

                if string.len() < key.block_size {
                    format!(
                        "{}{}",
                        "\u{0}".repeat(key.block_size - string.chars().count()),
                        string
                    )
                } else {
                    string
                }
            })
            .for_each(|s| result.push_str(&s));

        result
    }
}

impl<'a> Decryptor<'a, FromDecimalBlockScheme> for FromDecimalBlockScheme {
    type Input = str;
    type Output = Vec<BigInt>;
    type Key = DecimalUnicodeConversionSchemeKey;
}

impl<'a> SymmetricDecryptor<'a, FromDecimalBlockScheme> for FromDecimalBlockScheme {
    /// Interpretiert den String als eine Zeichenkette von Unicode-Zeichen bis zu einem gegebenen Radix, teilt diese
    /// Zeichenkette in Blöcke der gegebenen Größe auf und wandelt diese Blöcke in Dezimalzahlen um.
    ///
    /// # Arguments
    /// * `plaintext` - Der Klartext, der verschlüsselt werden soll.
    /// * `key` - Der Schlüssel, der die Basis und die Blockgröße enthält.
    ///
    /// # Returns
    /// Ein Vektor von Dezimalzahlen, die die verschlüsselten Blöcke repräsentieren.
    fn decrypt(ciphertext: &Self::Input, key: &Self::Key) -> Self::Output {
        assert!(key.radix > 0, "Die Basis muss größer als 0 sein.");
        assert!(key.block_size > 0, "Die Blockgröße muss größer als 0 sein.");

        // Hier wird der Text lediglich anhand der Blockgröße in Blöcke aufgeteilt und in Dezimalzahlen umgewandelt.
        // Entsprechend passiert hier nichts anderes als das ToDecimal::Encrypt.
        ToDecimalBlockScheme::encrypt(ciphertext, key)
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use super::*;

    #[test]
    fn test_happy_flow() {
        let m = vec![
            BigInt::from_str("107492014297546449612193802144047136").unwrap(),
            BigInt::from_str("159656113899559548508775364389320819").unwrap(),
            BigInt::from_str("183367115080887221772378868133959779").unwrap(),
            5750900.into(),
        ];
        let key = DecimalUnicodeConversionSchemeKey {
            radix: 55296,
            block_size: 8,
        };

        let ciphertext = FromDecimalBlockScheme::encrypt(&m, &key);

        assert_eq!(
            ciphertext,
            "Da苉 ist eine Testnachric\u{0}\u{0}\u{0}\u{0}\u{0}\u{0}ht"
        );

        let plaintext = FromDecimalBlockScheme::decrypt(&ciphertext, &key);
        assert_eq!(m, plaintext);
    }

    #[test]
    fn test_empty_vec() {
        let m = vec![];
        let key = DecimalUnicodeConversionSchemeKey {
            radix: 55296,
            block_size: 8,
        };

        let ciphertext = FromDecimalBlockScheme::encrypt(&m, &key);
        assert_eq!(ciphertext, "");

        let plaintext = FromDecimalBlockScheme::decrypt(&ciphertext, &key);
        assert_eq!(m, plaintext);
    }

    #[test]
    #[should_panic]
    fn test_invalid_radix_encrypt() {
        let key = DecimalUnicodeConversionSchemeKey {
            radix: 0,
            block_size: 8,
        };

        FromDecimalBlockScheme::encrypt(&vec![], &key);
    }

    #[test]
    #[should_panic]
    fn test_invalid_block_size_encrypt() {
        let key = DecimalUnicodeConversionSchemeKey {
            radix: 55296,
            block_size: 0,
        };

        FromDecimalBlockScheme::encrypt(&vec![], &key);
    }

    #[test]
    #[should_panic]
    fn test_invalid_radix_decrypt() {
        let key = DecimalUnicodeConversionSchemeKey {
            radix: 0,
            block_size: 8,
        };

        let s = "";
        FromDecimalBlockScheme::decrypt(s, &key);
    }

    #[test]
    #[should_panic]
    fn test_invalid_block_size_decrypt() {
        let key = DecimalUnicodeConversionSchemeKey {
            radix: 55296,
            block_size: 0,
        };

        let s = "";
        FromDecimalBlockScheme::decrypt(s, &key);
    }

    #[test]
    fn test_manipulated_block_remains_other_blocks_valid() {
        let m = vec![
            BigInt::from_str("107492014297546449612193802144047136").unwrap(),
            BigInt::from_str("159656113899559548508775364389320819").unwrap(),
            BigInt::from_str("183367115080887221772378868133959779").unwrap(),
            5750900.into(),
        ];
        let key = DecimalUnicodeConversionSchemeKey {
            radix: 55296,
            block_size: 8,
        };

        let ciphertext = FromDecimalBlockScheme::encrypt(&m, &key);

        let mut manipulated_ciphertext = ciphertext.clone();
        manipulated_ciphertext.remove(0);

        let plaintext = FromDecimalBlockScheme::decrypt(&manipulated_ciphertext, &key);
        assert_eq!(
            plaintext,
            vec![
                BigInt::from_str("154287324233491923008251865530564709").unwrap(),
                BigInt::from_str("165979152362535971847205438623910004").unwrap(),
                BigInt::from_str("173882400154251057641497437834283008").unwrap(),
                5750900.into()
            ]
        );
        // Hier ist nur der erste Block manipuliert, die anderen Blöcke sind noch valide.
        // Das Zeichen ggf am Ende sieht nur aus, als wäre es dort falsch, es steht aber an der richtigen Stelle.
        // Das ist ein Zeichen, das von rechts nach links gelesen wird, also muss es rechts stehen, gehört aber zum ersten Block.
    }
}