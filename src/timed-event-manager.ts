import BattleScene from "#app/battle-scene";
import { TextStyle, addTextObject } from "#app/ui/text";
import { nil } from "#app/utils";
import i18next from "i18next";

export enum EventType {
  SHINY,
  NO_TIMER_DISPLAY
}

interface EventBanner {
  bannerKey?: string;
  xOffset?: number;
  yOffset?: number;
  scale?: number;
  availableLangs?: string[];
}

interface TimedEvent extends EventBanner {
  name: string;
  eventType: EventType;
  shinyMultiplier?: number;
  friendshipMultiplier?: number;
  startDate: Date;
  endDate: Date;
}

const timedEvents: TimedEvent[] = [
  {
    name: "Pride Update",
    eventType: EventType.SHINY,
    shinyMultiplier: 2,
    startDate: new Date(Date.UTC(2024, 5, 14, 0)),
    endDate: new Date(Date.UTC(2024, 5, 23, 0)),
    bannerKey: "pride-update",
    scale: 0.075
  },
  {
    name: "August Variant Update",
    eventType: EventType.SHINY,
    shinyMultiplier: 2,
    startDate: new Date(Date.UTC(2024, 7, 16, 0)),
    endDate: new Date(Date.UTC(2024, 7, 22, 0)),
    bannerKey: "august-variant-update",
    scale: 0.15
  },
  {
    name: "September Update",
    eventType: EventType.NO_TIMER_DISPLAY,
    startDate: new Date(Date.UTC(2024, 7, 28, 0)),
    endDate: new Date(Date.UTC(2024, 8, 15, 0)),
    bannerKey: "september-update",
    availableLangs: [ "en", "de", "it", "fr", "ja", "ko", "es", "pt-BR", "zh-CN" ],
    scale: 0.27
  },
  {
    name: "Egg Skip Update",
    eventType: EventType.NO_TIMER_DISPLAY,
    startDate: new Date(Date.UTC(2024, 8, 15, 0)),
    endDate: new Date(Date.UTC(2024, 8, 19, 0)),
    bannerKey: "egg-update",
    scale: 0.19,
    availableLangs: [ "en", "de", "it", "fr", "ja", "ko", "es", "pt-BR", "zh-CN" ]
  },
  {
    name: "Halloween Update",
    eventType: EventType.SHINY,
    shinyMultiplier: 2,
    friendshipMultiplier: 2,
    startDate: new Date(Date.UTC(2024, 10, 5, 0)),
    endDate: new Date(Date.UTC(2024, 10, 13, 0)),
    bannerKey: "halloween2024-event-",
    scale: 0.19,
    availableLangs: [ "en", "de", "it", "fr", "ja", "ko", "es", "pt-BR", "zh-CN" ]
  }
];

export class TimedEventManager {
  constructor() {}

  isActive(event: TimedEvent) {
    return (
      event.startDate < new Date() &&
        new Date() < event.endDate
    );
  }

  activeEvent(): TimedEvent | undefined {
    return timedEvents.find((te: TimedEvent) => this.isActive(te));
  }

  isEventActive(): boolean {
    return timedEvents.some((te: TimedEvent) => this.isActive(te));
  }

  activeEventHasBanner(): boolean {
    const activeEvents = timedEvents.filter((te) => this.isActive(te) && te.hasOwnProperty("bannerFilename"));
    return activeEvents.length > 0;
  }

  getFriendshipMultiplier(): number {
    let multiplier = 1;
    const friendshipEvents = timedEvents.filter((te) => this.isActive(te));
    friendshipEvents.forEach((fe) => {
      multiplier *= fe.friendshipMultiplier ?? 1;
    });

    return multiplier;
  }

  getShinyMultiplier(): number {
    let multiplier = 1;
    const shinyEvents = timedEvents.filter((te) => te.eventType === EventType.SHINY && this.isActive(te));
    shinyEvents.forEach((se) => {
      multiplier *= se.shinyMultiplier ?? 1;
    });

    return multiplier;
  }

  getEventBannerFilename(): string {
    return timedEvents.find((te: TimedEvent) => this.isActive(te))?.bannerKey ?? "";
  }
}

export class TimedEventDisplay extends Phaser.GameObjects.Container {
  private event: TimedEvent | nil;
  private eventTimerText: Phaser.GameObjects.Text;
  private banner: Phaser.GameObjects.Image;
  private bannerShadow: Phaser.GameObjects.Rectangle;
  private availableWidth: number;
  private eventTimer: NodeJS.Timeout | null;

  constructor(scene: BattleScene, x: number, y: number, event?: TimedEvent) {
    super(scene, x, y);
    this.availableWidth = scene.scaledCanvas.width;
    this.event = event;
    this.setVisible(false);
  }

  /**
   * Set the width that can be used to display the event timer and banner. By default
   * these elements get centered horizontally in that space, in the bottom left of the screen
   */
  setWidth(width: number) {
    if (width !== this.availableWidth) {
      this.availableWidth = width;
      const xPosition = this.availableWidth / 2 + (this.event?.xOffset ?? 0);
      if (this.banner) {
        this.banner.x = xPosition;
      }
      if (this.eventTimerText) {
        this.eventTimerText.x = xPosition;
      }
    }
  }

  setup() {
    const lang = i18next.resolvedLanguage;
    if (this.event && this.event.bannerKey) {
      let key = this.event.bannerKey;
      if (lang && this.event.availableLangs && this.event.availableLangs.length > 0) {
        if (this.event.availableLangs.includes(lang)) {
          key += lang;
        } else {
          key += "en";
        }
      }
      console.log(this.event.bannerKey);

      this.banner = new Phaser.GameObjects.Image(this.scene, ((this.scene.game.canvas.width / 6) / 4) + 20, 152, key);
      this.banner.setName("img-event-banner");
      this.banner.setOrigin(0.5, 1.0);
      this.banner.setScale(this.event.scale);

      this.bannerShadow = new Phaser.GameObjects.Rectangle(this.scene, this.banner.x + 2, this.banner.y + 2, this.banner.width, this.banner.height, 0x484848);
      this.bannerShadow.setName("rect-event-banner-shadow");
      this.bannerShadow.setOrigin(0.5, 1.0);
      this.bannerShadow.setScale(this.event.scale);
      this.bannerShadow.setAlpha(0.5);

      this.eventTimerText = addTextObject(this.scene, ((this.scene.game.canvas.width / 6) / 4) + 20, ((this.scene.game.canvas.height / 6) / 2) + 74, this.timeToGo(this.event.endDate), TextStyle.EVENTS);
      this.eventTimerText.setName("text-event-timer");
      this.eventTimerText.setScale(0.15);
      this.eventTimerText.setOrigin(0.5, 0.5);

      this.add([
        this.eventTimerText,
        this.bannerShadow,
        this.banner
      ]);
    }
  }

  show() {
    this.setVisible(true);
    this.updateCountdown();

    this.eventTimer = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  clear() {
    this.setVisible(false);
    this.eventTimer && clearInterval(this.eventTimer);
    this.eventTimer = null;
  }

  private timeToGo(date: Date) {

    // Utility to add leading zero
    function z(n) {
      return (n < 10 ? "0" : "") + n;
    }
    const now = new Date();
    let diff = Math.abs(date.getTime() - now.getTime());

    // Allow for previous times
    diff = Math.abs(diff);

    // Get time components
    const days = diff / 8.64e7 | 0;
    const hours = diff % 8.64e7 / 3.6e6 | 0;
    const mins  = diff % 3.6e6 / 6e4 | 0;
    const secs  = Math.round(diff % 6e4 / 1e3);

    // Return formatted string
    return i18next.t("custom:endEvent", { days: z(days), hours: z(hours), minutes: z(mins), seconds: z(secs) });
  }

  updateCountdown() {
    if (this.event) {
      this.eventTimerText.setText(this.timeToGo(this.event.endDate));
    }
  }
}
