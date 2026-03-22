declare module "canvas-confetti" {
  type ConfettiOptions = {
    particleCount?: number;
    spread?: number;
    colors?: string[];
  };

  export default function confetti(options?: ConfettiOptions): Promise<null>;
}
