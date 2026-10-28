# Symulator bezrobocia

Interaktywna strona HTML symulująca, jak wzrost bezrobocia wpływa na gospodarkę i finanse publiczne: PKB, konsumpcję, dochody i wydatki budżetu, deficyt, dług, inflację i koszt obsługi długu.

Bez zależności i bez budowania. Otwórz `index.html` w przeglądarce.

## Co można ustawiać

- **Szok na rynku pracy:** skala (pp), czas trwania, horyzont symulacji.
- **Polityka fiskalna:** stymulus, aktywizacja zawodowa, mnożnik fiskalny.
- **Podatki i składki:** PIT, składki, VAT, CIT.
- **Wydatki i zasiłki:** wydatki bazowe, wysokość i zasięg zasiłku.
- **Struktura gospodarki:** prawo Okuna, histereza, krzywa Phillipsa, skłonność do konsumpcji, wzrost potencjału.
- **Dług i rynki:** poziom długu, oprocentowanie, premia za ryzyko powyżej progu zadłużenia.

Gotowe scenariusze: łagodna recesja, kryzys finansowy, szok jak COVID, głęboka depresja oraz dwie odpowiedzi polityki (stymulus kontra cięcia).

## Model (skrót)

Model kwartalny w cenach stałych (`model.js`), z grubsza skalibrowany na gospodarkę zbliżoną do polskiej.

1. Bezrobocie rośnie do poziomu docelowego na czas szoku i wraca wolniej. Histereza podnosi stopę naturalną.
2. PKB według prawa Okuna: `PKB = potencjał × (1 − k × Δu)`.
3. Fundusz płac, dochód rozporządzalny i konsumpcja wynikają z zatrudnienia.
4. Dochody budżetu: PIT, składki, VAT, CIT (wrażliwy na koniunkturę) i pozostałe.
5. Wydatki: bazowe, zasiłki, aktywizacja, stymulus, odsetki.
6. Dług rośnie o deficyt. Powyżej progu zadłużenia rośnie premia za ryzyko.
7. Inflacja: krzywa Phillipsa z inercją.

To model **edukacyjny**. Ilustruje mechanizmy, nie prognozuje przyszłości.

## Struktura

| Plik | Zawartość |
|------|-----------|
| `index.html` | struktura strony |
| `style.css` | style (ciemny i jasny motyw) |
| `model.js` | model ekonomiczny (czysty JS, działa także w Node) |
| `app.js` | interfejs, wykresy SVG, tooltipy |
