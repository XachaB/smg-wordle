export enum Difficulty {
    Normal,
    Hard,
    UltraHard,
}

export const gameName = "SMG Wordle";
export const maxGuesses = 6;

export function urlParam(name: string): string | null {
    return new URLSearchParams(window.location.search).get(name);
}

export function pick<T>(array: Array<T>): T {
    const now = new Date();
    const todaySeed =
        now.toLocaleDateString("en-US", {year: "numeric"}) +
        now.toLocaleDateString("en-US", {month: "2-digit"}) +
        now.toLocaleDateString("en-US", {day: "2-digit"});
    return array[Number(todaySeed) % array.length]
}

// https://a11y-guidelines.orange.com/en/web/components-examples/make-a-screen-reader-talk/
export function speak(
    text: string,
    priority: "polite" | "assertive" = "assertive"
) {
    var el = document.createElement("div");
    var id = "speak-" + Date.now();
    el.setAttribute("id", id);
    el.setAttribute("aria-live", priority || "polite");
    el.classList.add("sr-only");
    document.body.appendChild(el);

    window.setTimeout(function () {
        document.getElementById(id)!.innerHTML = text;
    }, 100);

    window.setTimeout(function () {
        document.body.removeChild(document.getElementById(id)!);
    }, 1000);
}

export function ordinal(n: number): string {
    return n + ([, "st", "nd", "rd"][(n % 100 >> 3) ^ 1 && n % 10] || "th");
}

export const englishNumbers =
    "zero one two three four five six seven eight nine ten eleven".split(" ");

