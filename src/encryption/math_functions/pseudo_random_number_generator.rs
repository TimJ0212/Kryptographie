use atomic_counter::{AtomicCounter, RelaxedCounter};
use bigdecimal::num_bigint::{BigInt, ToBigInt};
use bigdecimal::{BigDecimal, One};
use log::{debug, trace};
use crate::encryption::math_functions::number_theory::number_theory_service::{NumberTheoryService, NumberTheoryServiceTrait};
use crate::encryption::math_functions::traits::divisible::Divisible;

use crate::encryption::math_functions::traits::increment::Increment;

///
/// Iterator für eine deterministische Zufallszahlfolge.
///
pub struct PseudoRandomNumberGenerator {
    sqrt_m: BigDecimal,
    number_theory_service: NumberTheoryService,
}

impl PseudoRandomNumberGenerator {
    ///
    /// Erstellt eine neue Instanz des PseudoRandomNumberGenerator.
    ///
    /// # Argumente
    /// * `a` - Die untere Grenze des Bereichs.
    /// * `b` - Die obere Grenze des Bereichs.
    /// * `random_seed` - Seed für die Zufallszahlfolge.
    ///
    /// # Rückgabe
    /// * PseudoRandomNumberGenerator
    ///
    pub fn new(random_seed: u32, number_theory_service: NumberTheoryService) -> Self {
        let mut initial_random = random_seed;
        let sqrt_m;
        loop {
            match BigDecimal::from(initial_random).sqrt() {
                Some(sqrt) => {
                    if !sqrt.is_integer() {
                        sqrt_m = sqrt;
                        break;
                    } else {
                        initial_random.increment_assign()
                    }
                }
                None => panic!("Wurzel m konnte nicht berechnet werden."),
            }
        }
        return Self { sqrt_m, number_theory_service };
    }

    /// Diese Methode gibt eine Zufallszahl im Bereich von a bis b zurück.
    /// Inkrementiert den AtomicCounter n_counter!
    ///
    /// # Argumente
    /// * `a` - Die untere Grenze des Bereichs.
    /// * `b` - Die obere Grenze des Bereichs.
    /// * `n_counter` - Der AtomicCounter, der den Index des Elementes aus der Zufallsfolge enthält.
    ///
    /// # Rückgabe
    /// * BigUint
    pub fn take(&self, a: &BigInt, b: &BigInt, n_counter: &RelaxedCounter) -> BigInt {
        trace!(
            "Zufallszahl aus dem Bereich von {} bis {} mit n {}",
            a,
            b,
            n_counter.get()
        );
        let factor: BigDecimal =
            (BigDecimal::from(n_counter.inc() as u32) * &self.sqrt_m) % BigDecimal::one();
        let range: BigDecimal = (b - a + BigInt::one()).into();

        // Das unwrap() wird niemals fehlschlagen, weil die Implementation von to_bigint() nur
        // Some, aber niemals None zurückgibt. Es ist unklar, warum es überhaupt Option ist.
        a + (factor * range).to_bigint().unwrap()
    }

    /// Diese Methode gibt eine ungerade Zufallszahl im Bereich von a bis b zurück.
    /// Inkrementiert den AtomicCounter n_counter!
    ///
    /// # Argumente
    /// * `a` - Die untere Grenze des Bereichs.
    /// * `b` - Die obere Grenze des Bereichs.
    /// * `n_counter` - Index des Elementes aus der Zufallsfolge.
    ///
    /// # Rückgabe
    /// * BigUint
    pub fn take_uneven(&self, a: &BigInt, b: &BigInt, n_counter: &RelaxedCounter) -> BigInt {
        self.take(a, b, n_counter) | BigInt::one()
    }

    /// Generiert eine Primzahl mit der angegebenen Breite.
    ///
    /// # Argumente
    /// * `size` - Die Bit-Breite der Primzahl.
    /// * `miller_rabin_iterations` - Die Anzahl der Iterationen für den Miller-Rabin-Test.
    /// * `n_counter` - Der Zähler für den Zugriff auf die Zufallsfolge. Achtung: Der Zähler wird inkrementiert!
    ///
    /// # Rückgabe
    /// Die generierte Primzahl.
    pub fn generate_prime(
        &self,
        size: u32,
        miller_rabin_iterations: u32,
        n_counter: &RelaxedCounter,
    ) -> BigInt {
        debug!(
            "Generiere eine Primzahl mit size {} und Miller-Rabin-Iterations {}",
            size, miller_rabin_iterations
        );

        let upper_bound = &BigInt::from(2).pow(size);
        let lower_bound = &BigInt::from(2).pow(size - 1);

        let mut prime_candidate = self.take_uneven(lower_bound, upper_bound, n_counter);

        while !self.number_theory_service.is_probably_prime(
            &prime_candidate,
            miller_rabin_iterations,
            self, // Ggf sollte hier eine neue Instanz mit zufälligem Seed übergeben werden?
        ) {
            trace!(
                "Generierter Primkandidat {} ist keine Primzahl",
                prime_candidate
            );
            prime_candidate = self.take_uneven(lower_bound, upper_bound, n_counter);
        }
        debug!(
            "Generierter Primkandidat {} ist eine Primzahl",
            prime_candidate
        );
        prime_candidate
    }

    /// Generiert eine sichere Primzahl mit der angegebenen Breite und liefert eine passende
    /// Primitivwurzel.
    /// Eine sichere Primzahl ist eine Primzahl p, bei der auch (p-1)/2 eine Primzahl ist.
    /// Eine Primitivwurzel ist ein Element g, welches jede Zahl aus der Menge {1, 2, ..., p-1}
    /// als Potenz von g darstellen kann.
    ///
    /// # Argumente
    /// * `size` - Die Bit-Breite der Primzahl.
    /// * `miller_rabin_iterations` - Die Anzahl der Iterationen für die Miller-Rabin-Tests.
    /// * `n_counter` - Der Zähler für den Zugriff auf die Zufallsfolge. Achtung: Der Zähler wird inkrementiert!
    ///
    /// # Rückgabe
    /// Die generierte sichere Primzahl und die Primitivwurzel.
    pub fn generate_secure_prime_with_primitive_root(
        &self,
        size: u32,
        miller_rabin_iterations: u32,
        n_counter: &RelaxedCounter,
    ) -> (BigInt, BigInt) {
        debug!(
            "Generiere eine sichere Primzahl mit size {} und Miller-Rabin-Iterations {}",
            size, miller_rabin_iterations
        );

        let mut prime_candidate: BigInt;
        let mut source_prime: BigInt;
        // Bestimmung der sicheren Primzahl
        loop {
            prime_candidate = self.generate_prime(size, miller_rabin_iterations, n_counter);
            source_prime = prime_candidate.decrement().half();
            if self.number_theory_service.is_probably_prime(
                &source_prime,
                miller_rabin_iterations,
                self, // Ggf sollte hier eine neue Instanz mit zufälligem Seed übergeben werden?
            ) {
                debug!(
                    "Generierter Primkandidat {} ist eine sichere Primzahl",
                     prime_candidate
                );
                break;
            }
            trace!(
                "Generierter Primkandidat {} ist keine sichere Primzahl",
                prime_candidate
            );
        }

        debug!(
            "Generiere Primitivwurzel für die sichere Primzahl {}",
            prime_candidate
        );
        let mut primitive_root_candidate: BigInt;
        // Bestimmung der Primitivwurzel
        loop {
            primitive_root_candidate = self.take(&2.into(), &(&prime_candidate - BigInt::from(2)), n_counter);
            // Eine Zahl g ist eine Primitivwurzel, wenn g^(q) mod p = p - 1
            // mit q = source_prime und p = prime_candidate
            // Die Prüfung geschieht normalerweise mit -1, aber weil fast_exponentiation mit
            // euklidischem Rest rechnet, muss hier p - 1 verwendet werden.
            let is_primitive_root = self.number_theory_service.fast_exponentiation(
                &primitive_root_candidate,
                &source_prime,
                &prime_candidate,
            ) == prime_candidate.decrement();

            if is_primitive_root {
                debug!(
                    "Generierter Primitivwurzelkandidat {} ist eine Primitivwurzel",
                    primitive_root_candidate
                );
                break;
            }
            trace!(
                "Generierter Primitivwurzelkandidat {} ist keine Primitivwurzel",
                primitive_root_candidate
            );
        }

        (prime_candidate, primitive_root_candidate)
    }

}

#[cfg(test)]
mod tests {
    use atomic_counter::RelaxedCounter;
    use bigdecimal::num_bigint::BigInt;
    use crate::encryption::math_functions::number_theory::number_theory_service::NumberTheoryService;
    use crate::encryption::math_functions::number_theory::number_theory_service::NumberTheoryServiceSpeed::Fast;

    use crate::encryption::math_functions::pseudo_random_number_generator::PseudoRandomNumberGenerator;
    use crate::encryption::math_functions::traits::divisible::Divisible;

    /*
    Scope dieser Tests ist nicht der NumberTheoryService, also laufen alle Tests mit dem Schnellen.
    Weil der Service stateless ist, kann er hier als Konstante definiert werden.
     */
    const SERVICE: NumberTheoryService = NumberTheoryService::new(Fast);
    #[test]
    fn test_happy_flow() {
        let a: BigInt = 1u32.into();
        let b: BigInt = 997u32.into();

        let random = PseudoRandomNumberGenerator::new(13, SERVICE);

        let n = RelaxedCounter::new(1);

        assert_eq!(random.take(&a, &b, &n), 604u32.into());
        assert_eq!(random.take(&a, &b, &n), 211u32.into());
        assert_eq!(random.take(&a, &b, &n), 815u32.into());
        assert_eq!(random.take(&a, &b, &n), 421u32.into());
        assert_eq!(random.take(&a, &b, &n), 28u32.into());
        assert_eq!(random.take(&a, &b, &n), 632u32.into());
        assert_eq!(random.take(&a, &b, &n), 239u32.into());
        assert_eq!(random.take(&a, &b, &n), 842u32.into());
        assert_eq!(random.take(&a, &b, &n), 449u32.into());
        assert_eq!(random.take(&a, &b, &n), 56u32.into());

        let a: BigInt = 500u32.into();
        let b: BigInt = 6000u32.into();

        let random = PseudoRandomNumberGenerator::new(40, SERVICE);

        for _ in 1..500 {
            let random = random.take(&a, &b, &n);
            assert!(random >= a && random <= b);
        }
    }

    #[test]
    fn test_take_uneven() {
        let a: BigInt = 500u32.into();
        let b: BigInt = 6000u32.into();

        let random = PseudoRandomNumberGenerator::new(23, SERVICE);

        let n = RelaxedCounter::new(1);

        for _ in 1..500 {
            let random = random.take_uneven(&a, &b, &n);
            assert!(random >= a && random <= b);
            assert!(random.is_not_divisible_by(&BigInt::from(2)));
        }
    }
}
