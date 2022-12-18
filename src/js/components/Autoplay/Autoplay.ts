import { ARIA_CONTROLS, ARIA_LABEL } from '../../constants/attributes';
import { CLASS_ACTIVE } from '../../constants/classes';
import {
  EVENT_AUTOPLAY_PAUSE,
  EVENT_AUTOPLAY_PLAY,
  EVENT_AUTOPLAY_PLAYING,
  EVENT_MOVE,
  EVENT_REFRESH,
  EVENT_SCROLL,
} from '../../constants/events';
import { BaseComponent, ComponentConstructor } from '../../types';
import { getAttribute, RequestInterval, setAttribute, style, toggleClass } from '@splidejs/utils';
import { INTERVAL_DATA_ATTRIBUTE } from './constants';


/**
 * The interface for the Autoplay component.
 *
 * @since 3.0.0
 */
export interface AutoplayComponent extends BaseComponent {
  play(): void;
  pause(): void;
  isPaused(): boolean;
}

/**
 * The component for autoplay, handling a progress bar and a toggle button.
 *
 * @since 3.0.0
 *
 * @param Splide     - A Splide instance.
 * @param Components - A collection of components.
 * @param options    - Options.
 * @param event      - An EventInterface instance.
 *
 * @return An Autoplay component object.
 */
export const Autoplay: ComponentConstructor<AutoplayComponent> = (Splide, Components, options, event) => {
  const { on, bind, emit } = event;
  const duration = options.interval || 5000;
  const interval = RequestInterval(duration, () => Splide.go('>'), updateRate);
  const { isPaused } = interval;
  const { Elements, Elements: { root, toggle } } = Components;

  /**
   * Indicates whether the slider is hovered or not.
   */
  let hovered: boolean;

  /**
   * Indicates whether one of slider elements has focus or not.
   */
  let focused: boolean;

  /**
   * Indicates whether the autoplay is stopped or not.
   * If stopped, autoplay won't start automatically unless `play()` is explicitly called.
   */
  let stopped = options.autoplay === 'pause';

  /**
   * Called when the component is mounted.
   */
  function mount(): void {
    if (options.autoplay) {
      listen();
      toggle && setAttribute(toggle, ARIA_CONTROLS, Elements.track.id);
      stopped || play();
      updateButton();
    }
  }

  /**
   * Listens to some events.
   */
  function listen(): void {
    const { pauseOnHover = true, pauseOnFocus = true } = options;

    if (pauseOnHover) {
      bind(root, 'mouseenter mouseleave', e => {
        hovered = e.type === 'mouseenter';
        autoToggle();
      });
    }

    if (pauseOnFocus) {
      bind(root, 'focusin focusout', e => {
        focused = e.type === 'focusin';
        autoToggle();
      });
    }

    if (toggle) {
      bind(toggle, 'click', () => {
        stopped ? play() : pause(true);
      });
    }

    on([EVENT_MOVE, EVENT_SCROLL, EVENT_REFRESH], interval.rewind);
    on(EVENT_MOVE, updateInterval);
  }

  /**
   * Starts autoplay and clears all flags.
   */
  function play(): void {
    if (isPaused() && Components.Slides.isEnough()) {
      const { resetProgress = true } = options;

      updateInterval();
      interval.start(!resetProgress);
      focused = hovered = stopped = false;
      updateButton();
      emit(EVENT_AUTOPLAY_PLAY);
    }
  }

  /**
   * Pauses autoplay.
   *
   * @param stop - If `true`, autoplay keeps paused until `play()` is explicitly called.
   */
  function pause(stop = true): void {
    stopped = stop;
    updateButton();

    if (!isPaused()) {
      interval.pause();
      emit(EVENT_AUTOPLAY_PAUSE);
    }
  }

  /**
   * Toggles play/pause according to current flags.
   * If autoplay is manually paused, this will do nothing.
   */
  function autoToggle(): void {
    if (!stopped) {
      hovered || focused ? pause(false) : play();
    }
  }

  /**
   * Updates the toggle button status.
   */
  function updateButton(): void {
    if (toggle) {
      toggleClass(toggle, CLASS_ACTIVE, !stopped);
      setAttribute(toggle, ARIA_LABEL, Splide.i18n(stopped ? 'play' : 'pause'));
    }
  }

  /**
   * Called on every animation frame while autoplay is active.
   *
   * @param rate - The progress rate between 0 and 1.
   */
  function updateRate(rate: number): void {
    const { bar } = Elements;
    bar && style(bar, 'width', `${ rate * 100 }%`);
    emit(EVENT_AUTOPLAY_PLAYING, rate);
  }

  /**
   * Updates or restores the interval duration.
   *
   * @param index - Optional. A slide index.
   */
  function updateInterval(index = Splide.index): void {
    const Slide = Components.Slides.getAt(index);
    interval.set(Slide && Number(getAttribute(Slide.slide, INTERVAL_DATA_ATTRIBUTE)) || duration);
  }

  return {
    mount,
    destroy: interval.cancel,
    play,
    pause,
    isPaused,
  };
};
