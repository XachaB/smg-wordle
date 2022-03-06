export enum Difficulty {
    Normal,
    Hard,
    UltraHard,
}

export const gameName = "SMG Wordle";
export const maxGuesses = 6;

export function hashCode(s: string): number {
    for(var i = 0, h = 0; i < s.length; i++)
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return h;
}

export function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function urlParam(name: string): string | null {
    return new URLSearchParams(window.location.search).get(name);
}

function dateRandom(i: number): number {
    const now = new Date();
    now.setDate(now.getDate() + i)
    const seed =
        now.toLocaleDateString("en-US", {year: "numeric"}) +
        now.toLocaleDateString("en-US", {month: "2-digit"}) +
        now.toLocaleDateString("en-US", {day: "2-digit"});
    return mulberry32(Number(seed))()
}


export function pick<T>(array: Array<T>, seed: number): T {
  return array[Math.floor(array.length * seed)];

}
export function pickToday<T>(array: Array<T>): T {
  return pick<T>(array, dateRandom(0))
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
    return n + (["", "st", "nd", "rd"][(n % 100 >> 3) ^ 1 && n % 10] || "th");
}

export const englishNumbers =
    "zero one two three four five six seven eight nine ten eleven".split(" ");

