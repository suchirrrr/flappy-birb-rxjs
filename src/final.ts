/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

import "./style.css";

import {
    Observable,
    catchError,
    concat,
    combineLatest,
    startWith,
    filter,
    fromEvent,
    interval,
    map,
    toArray,
    scan,
    switchMap,
    take,
    merge,
    shareReplay,
    of,
    withLatestFrom,
    takeUntil,
} from "rxjs";
import { fromFetch } from "rxjs/fetch";

/** Constants */

const Viewport = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 400,
} as const;

const Birb = {
    WIDTH: 42,
    HEIGHT: 30,
    GRAVITY: 1,
} as const;

const Constants = {
    PIPE_WIDTH: 50,
    PIPE_SPEED: 6,
    TICK_RATE_MS: 29, // Might need to change this!
} as const;

abstract class RNG {
    private static m = 0x80000000; // 2^31
    private static a = 1103515245;
    private static c = 12345;

    public static hash = (seed: number): number =>
        (RNG.a * seed + RNG.c) % RNG.m;

    public static scale = (hash: number): number =>
        (2 * hash) / (RNG.m - 1) - 1; // in [-1, 1]
}

export function createRngStreamFromSource<T>(source$: Observable<T>) {
    return function createRngStream(seed: number = 0): Observable<number> {
        const randomNumberStream = source$.pipe(
            scan(state => RNG.hash(state), seed),
            map(state => RNG.scale(state)),
        );

        return randomNumberStream;
    };
}

// User input

type Key = "Space";

// State processing
type pipe = {
    x: number;
    gapY: number;
    gapHeight: number;
    appearanceTime: number;
    scored?: boolean;
};

type State = Readonly<{
    gameEnd: boolean;
    win: boolean;
    paused: boolean;
    birbPosition: { x: number; y: number };
    birbVelocity: { x: number; y: number };
    pipes: ReadonlyArray<pipe>;
    originalPipes: ReadonlyArray<pipe>;
    score: number;
    lives: number;
    randstate: number;
    backgroundIndex: number;
    gameTime: number;
    ghosts: ReadonlyArray<{ x: number; y: number } | null>;
}>;

const initialState: State = {
    gameEnd: false,
    paused: false,
    win: false,
    birbPosition: { x: 100, y: 100 },
    birbVelocity: { x: 0, y: 0 },
    originalPipes: [],
    pipes: [],
    score: 0,
    lives: 3,
    randstate: 42,
    backgroundIndex: 0,
    gameTime: 0,
    ghosts: [],
};


const resetGame = (s: State): State => ({
  ...s,
  gameEnd: false,
  win: false,
  birbPosition: { x: 100, y: 100 },
  birbVelocity: { x: 0, y: 0 },
  pipes: s.originalPipes.map(p => ({ ...p })),
  score: 0,
  lives: 3,
  randstate: 42,
  gameTime: 0,
  backgroundIndex: 0,
  ghosts: [],
});

/** Move bird by applying gravity */
const moveBird = (s: State) => {
    const newVelocity = s.birbVelocity.y + Birb.GRAVITY;
    const newPosY = s.birbPosition.y + newVelocity;
    return { velocityY: newVelocity, posY: newPosY };
};

/** Move pipes leftward */
const movePipes = (pipes: ReadonlyArray<pipe>) =>
    pipes.map(p => ({ ...p, x: p.x - Constants.PIPE_SPEED }));

/** Score pipes when passed */
const passPipeScore = (pipes: ReadonlyArray<pipe>, birdX: number) =>
    pipes.map(p => {
        const rightEdge = p.x + Constants.PIPE_WIDTH;
        return !p.scored && rightEdge < birdX ? { ...p, scored: true } : p;
    });

/**
 * Updates the state by proceeding with one time step.
 *
 * @param s Current state
 * @returns Updated state
 */
const tick = (s: State): State => {
    if (s.gameEnd || s.paused) return s;

    const time = s.gameTime + Constants.TICK_RATE_MS;
    const { velocityY, posY } = moveBird(s);

    const moved = movePipes(s.pipes);
    const scored = passPipeScore(moved, s.birbPosition.x);

    const newPoints = scored.filter(
        (p, i) => p.scored && !s.pipes[i]?.scored,
    ).length;
    const visible = scored.filter(p => p.x + Constants.PIPE_WIDTH > 0);

    const cleared = visible.length === 0 && s.lives > 0;

    const next: State = {
        ...s,
        birbVelocity: { ...s.birbVelocity, y: velocityY },
        birbPosition: { ...s.birbPosition, y: posY },
        pipes: visible,
        score: s.score + newPoints,
        gameTime: time,
        gameEnd: cleared || s.gameEnd,
        win: cleared || s.win,
    };

    return handleCollisions(next);
};

// Rendering (side effects)

/**
 * Brings an SVG element to the foreground.
 * @param elem SVG element to bring to the foreground
 */
const bringToForeground = (elem: SVGElement): void => {
    elem.parentNode?.appendChild(elem);
};

/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
const show = (elem: SVGElement): void => {
    elem.setAttribute("visibility", "visible");
    bringToForeground(elem);
};

/**
 * Hides a SVG element on the canvas.
 * @param elem SVG element to hide
 */
const hide = (elem: SVGElement): void => {
    elem.setAttribute("visibility", "hidden");
};

/**
 * Creates an SVG element with the given properties.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
 * element names and properties.
 *
 * @param namespace Namespace of the SVG element
 * @param name SVGElement name
 * @param props Properties to set on the SVG element
 * @returns SVG element
 */
const createSvgElement = (
    namespace: string | null,
    name: string,
    props: Record<string, string> = {},
): SVGElement => {
    const elem = document.createElementNS(namespace, name) as SVGElement;
    Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem;
};

/** Check if bird hit top/bottom walls */
const hitTopBottom = (s: State) => ({
    hitTop: s.birbPosition.y - Birb.HEIGHT / 2 <= 0,
    hitBottom: s.birbPosition.y + Birb.HEIGHT / 2 >= Viewport.CANVAS_HEIGHT,
});

/** Check if bird collides with any pipe */
const pipeCollisionPossiblity = (s: State) =>
    s.pipes.find(pipe => {
        const birdBack = s.birbPosition.x - Birb.WIDTH / 2;
        const birdToroso = s.birbPosition.x + Birb.WIDTH / 2;
        const birdHead = s.birbPosition.y - Birb.HEIGHT / 2;
        const birdLeg = s.birbPosition.y + Birb.HEIGHT / 2;

        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + Constants.PIPE_WIDTH;
        const gapTop = pipe.gapY - pipe.gapHeight / 2;
        const gapBottom = pipe.gapY + pipe.gapHeight / 2;

        const pipeCollison = birdToroso > pipeLeft && birdBack < pipeRight;
        const pipeGapCollision = birdHead < gapTop || birdLeg > gapBottom;

        return pipeCollison && pipeGapCollision;
    });

const handleCollisions = (s: State): State => {
    const { hitTop, hitBottom } = hitTopBottom(s);
    const collidedPipe = pipeCollisionPossiblity(s);

    if (!(hitTop || hitBottom || collidedPipe)) return s;

    const nextRand = RNG.hash(s.randstate);
    const random = RNG.scale(nextRand);      // gives a number in [-1, 1]
    const absolute = random < 0 ? -random : random; // absolute value
    const reboundStrength = 8 + absolute * 10;

    const reboundVelocityY =
        hitTop || (collidedPipe && s.birbPosition.y < collidedPipe.gapY)
            ? reboundStrength // bounce down
            : -reboundStrength; // bounce up

    const newLives = s.gameEnd ? s.lives : s.lives - 1;
    const gameEnd = newLives <= 0;

    return {
        ...s,
        lives: newLives,
        gameEnd,
        birbVelocity: { ...s.birbVelocity, y: reboundVelocityY },
        randstate: nextRand,
    };
};

const render = (): ((s: State) => void) => {
    // Text fields
    const livesText = document.querySelector("#livesText") as HTMLElement;
    const scoreText = document.querySelector("#scoreText") as HTMLElement;

    const svg = document.querySelector("#svgCanvas") as SVGSVGElement;
    svg.setAttribute(
        "viewBox",
        `0 0 ${Viewport.CANVAS_WIDTH} ${Viewport.CANVAS_HEIGHT}`,
    );

    // --- Permanent elements ---
    const bgImg = createSvgElement(svg.namespaceURI, "image", {
        href: "assets/morning.png",
        x: "0",
        y: "0",
        width: `${Viewport.CANVAS_WIDTH}`,
        height: `${Viewport.CANVAS_HEIGHT}`,
        preserveAspectRatio: "none",
    });
    svg.appendChild(bgImg);

    const birdImg = createSvgElement(svg.namespaceURI, "image", {
        href: "assets/birb.png",
        x: `${initialState.birbPosition.x - Birb.WIDTH / 2}`,
        y: `${initialState.birbPosition.y - Birb.HEIGHT / 2}`,
        width: `${Birb.WIDTH}`,
        height: `${Birb.HEIGHT}`,
    });
    svg.appendChild(birdImg);

    const indicatePause = createSvgElement(svg.namespaceURI, "image", {
        href: "assets/paused.png",
        x: "150",
        y: "100",
        width: "250",
        height: "180",
        opacity: "0.5",
    });
    svg.appendChild(indicatePause);
    hide(indicatePause);

    const indicateGameOver = createSvgElement(svg.namespaceURI, "image", {
        href: "assets/gameover.png",
        x: "150",
        y: "100",
        width: "250",
        height: "180",
        opacity: "0.7",
    });
    svg.appendChild(indicateGameOver);
    hide(indicateGameOver);

    const indicateWin = createSvgElement(svg.namespaceURI, "image", {
        href: "assets/win.png",
        x: "150",
        y: "100",
        width: "250",
        height: "180",
        opacity: "0.7",
    });
    svg.appendChild(indicateWin);
    hide(indicateWin);

    const indicateStartClick = createSvgElement(svg.namespaceURI, "image", {
        href: "assets/gamestart.png",
        x: "0",
        y: "0",
        width: `${Viewport.CANVAS_WIDTH}`,
        height: `${Viewport.CANVAS_HEIGHT}`,
        preserveAspectRatio: "none",
    });
    svg.appendChild(indicateStartClick);

    // --- Return the update loop ---
    return (s: State) => {
        // Update texts
        if (livesText) livesText.textContent = s.lives.toString();
        if (scoreText) scoreText.textContent = s.score.toString();

        // Update background
        bgImg.setAttribute(
            "href",
            s.backgroundIndex === 0
                ? "assets/morning.png"
                : "assets/background_night.png",
        );

        // Update bird position
        birdImg.setAttribute("x", `${s.birbPosition.x - Birb.WIDTH / 2}`);
        birdImg.setAttribute("y", `${s.birbPosition.y - Birb.HEIGHT / 2}`);

        // Clear old pipes & ghosts
        [...svg.querySelectorAll(".pipe, .ghost")].forEach(el => el.remove());

        // Draw pipes
        s.pipes.forEach(pipe => {
            const pipeTop = createSvgElement(svg.namespaceURI, "rect", {
                x: `${pipe.x}`,
                y: "0",
                width: `${Constants.PIPE_WIDTH}`,
                height: `${pipe.gapY - pipe.gapHeight / 2}`,
                fill: "green",
            });
            pipeTop.classList.add("pipe");

            const pipeBottom = createSvgElement(svg.namespaceURI, "rect", {
                x: `${pipe.x}`,
                y: `${pipe.gapY + pipe.gapHeight / 2}`,
                width: `${Constants.PIPE_WIDTH}`,
                height: `${Viewport.CANVAS_HEIGHT - (pipe.gapY + pipe.gapHeight / 2)}`,
                fill: "green",
            });
            pipeBottom.classList.add("pipe");

            svg.appendChild(pipeTop);
            svg.appendChild(pipeBottom);
        });

        // Draw ghosts
        if (s.ghosts && s.ghosts.length > 0 && !s.gameEnd) {
            s.ghosts.forEach(g => {
                if (g) {
                    const ghostBird = createSvgElement(
                        svg.namespaceURI,
                        "image",
                        {
                            href: "assets/birb.png",
                            x: `${g.x - Birb.WIDTH / 2}`,
                            y: `${g.y - Birb.HEIGHT / 2}`,
                            width: `${Birb.WIDTH}`,
                            height: `${Birb.HEIGHT}`,
                            opacity: "0.5",
                        },
                    );
                    ghostBird.classList.add("ghost");
                    svg.appendChild(ghostBird);
                }
            });
        }

        s.gameTime === 0 && !s.paused && !s.gameEnd && s.score === 0
            ? show(indicateStartClick)
            : hide(indicateStartClick);

        // indicators
        s.paused && !s.gameEnd ? show(indicatePause) : hide(indicatePause);

        if (s.gameEnd) {
            if (s.win) {
                show(indicateWin);
                hide(indicateGameOver);
            } else {
                show(indicateGameOver);
                hide(indicateWin);
            }
        } else {
            hide(indicateWin);
            hide(indicateGameOver);
        }
    };
};

export const state$ = (csvContents: string): Observable<State> => {
    /** User input */

    const key$: Observable<(s: State) => State> = fromEvent<KeyboardEvent>(
        document,
        "keypress",
    ).pipe(
        filter(({ code }) => code === "Space"),
        map(
            () =>
                (s: State): State =>
                    s.gameEnd
                        ? s
                        : { ...s, birbVelocity: { ...s.birbVelocity, y: -9 } },
        ),
    );

    const pause$: Observable<(s: State) => State> = fromEvent<KeyboardEvent>(
        document,
        "keydown",
    ).pipe(
        filter(e => e.code === "KeyP"),
        map(
            () =>
                (s: State): State => ({ ...s, paused: !s.paused }),
        ),
    );

    const restart$: Observable<(s: State) => State> = fromEvent<KeyboardEvent>(
        document,
        "keydown",
    ).pipe(
        filter(({ code }) => code === "KeyR"),
        map(() => (s: State) => s.gameEnd ? resetGame(s) : s)
    );
    const pipes = csvContents
        .trim()
        .split("\n")
        .slice(1)
        .map(line => {
            const [gap_y, gap_height, time] = line.split(",").map(Number);
            return {
                x: Viewport.CANVAS_WIDTH + time * 150,
                gapY: gap_y * Viewport.CANVAS_HEIGHT,
                gapHeight: gap_height * Viewport.CANVAS_HEIGHT,
                appearanceTime: time,
            };
        });

    const initial: State = { ...initialState, pipes, originalPipes: pipes };

    /** Determines the rate of time steps */
    const tick$: Observable<(s: State) => State> = interval(
        Constants.TICK_RATE_MS,
    ).pipe(map(() => tick));

    const changeBackground$: Observable<(s: State) => State> = restart$.pipe(
        switchMap(() =>
            interval(10000).pipe(
                map(
                    () =>
                        (s: State): State =>
                            s.gameEnd || s.paused
                                ? s
                                : {
                                      ...s,
                                      backgroundIndex:
                                          (s.backgroundIndex + 1) % 2,
                                  },
                ),
            ),
        ),
    );

    const reducers$ = merge(key$, tick$, changeBackground$, restart$, pause$);

    const baseState$ = reducers$.pipe(
        scan((state, reducerFn) => reducerFn(state), initial),
        shareReplay({ bufferSize: 1, refCount: true }),
    );

    const sampledPos$ = interval(Constants.TICK_RATE_MS).pipe(
        withLatestFrom(baseState$),
        filter(([_, s]) => !s.gameEnd && !s.paused), // only while alive
        map(([_, s]) => ({ x: s.birbPosition.x, y: s.birbPosition.y })),
    );

    const recordings$ = merge(of(null), restart$).pipe(
        switchMap(() =>
            sampledPos$.pipe(
                takeUntil(
                    merge(baseState$.pipe(filter(s => s.gameEnd)), restart$),
                ),
                toArray(),
            ),
        ),
    );

    const history$ = recordings$.pipe(
        scan(
            (all, frames) => (frames ? [...all, frames] : all),
            [] as { x: number; y: number }[][],
        ),
        shareReplay({ bufferSize: 1, refCount: true }),
    );

    const ghostsPos$ = restart$.pipe(
        withLatestFrom(history$),
        filter(([_, runs]) => runs.length > 0),
        switchMap(([_, runs]) =>
            combineLatest(
                runs.map(frames =>
                    concat(
                        interval(Constants.TICK_RATE_MS).pipe(
                            withLatestFrom(baseState$),
                            filter(([_, s]) => !s.paused && !s.gameEnd),
                            map(([i]) =>
                                i < frames.length ? frames[i] : null,
                            ),
                            take(frames.length),
                        ),
                        of(null),
                    ),
                ),
            ),
        ),
        startWith([]),
    );

    return combineLatest([baseState$, ghostsPos$]).pipe(
        map(([s, ghosts]) => ({ ...s, ghosts })),
    );
};

// The following simply runs your main function on window load.  Make sure to leave it in place.
// You should not need to change this, beware if you are.
if (typeof window !== "undefined") {
    const { protocol, hostname, port } = new URL(import.meta.url);
    const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}`;
    const csvUrl = `${baseUrl}/assets/map.csv`;

    // Get the file from URL
    const csv$ = fromFetch(csvUrl).pipe(
        switchMap(response => {
            if (response.ok) {
                return response.text();
            } else {
                throw new Error(`Fetch error: ${response.status}`);
            }
        }),
        catchError(err => {
            console.error("Error fetching the CSV file:", err);
            throw err;
        }),
    );

    // Observable: wait for first user click
    const click$ = fromEvent(document.body, "mousedown").pipe(
        take(1),
        switchMap(() => csv$.pipe(switchMap(contents => state$(contents)))),
    );

    click$.subscribe(render());
}
