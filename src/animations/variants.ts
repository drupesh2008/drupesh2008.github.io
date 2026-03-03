import { Variants } from 'framer-motion'

export const fadeInUp: Variants = {
  initial: {
    y: 60,
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
}

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export const slideInLeft: Variants = {
  initial: {
    x: -60,
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
}

export const slideInRight: Variants = {
  initial: {
    x: 60,
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
}

export const scaleIn: Variants = {
  initial: {
    scale: 0.8,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
}

export const textReveal: Variants = {
  initial: {
    y: 20,
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: "easeOut",
    },
  },
}

export const blurIn: Variants = {
  initial: {
    opacity: 0,
    filter: "blur(10px)",
  },
  animate: {
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
}

export const scaleBlurIn: Variants = {
  initial: {
    scale: 0.9,
    opacity: 0,
    filter: "blur(8px)",
  },
  animate: {
    scale: 1,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
}

export const staggerGrid: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

export const glowPulse: Variants = {
  initial: {
    boxShadow: "0 0 0px rgba(100, 255, 218, 0)",
  },
  animate: {
    boxShadow: [
      "0 0 10px rgba(100, 255, 218, 0.3)",
      "0 0 20px rgba(100, 255, 218, 0.1)",
      "0 0 10px rgba(100, 255, 218, 0.3)",
    ],
    transition: {
      duration: 2,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
}

// =============================================
// Orbital Ring Animation Variants
// =============================================

export const orbitalNodeIn: Variants = {
  initial: {
    scale: 0,
    opacity: 0,
    x: '-50%',
    y: '-50%',
  },
  animate: {
    scale: 1,
    opacity: 1,
    x: '-50%',
    y: '-50%',
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
}

export const orbitalStagger: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 1.0,
    },
  },
}

export const identityReveal: Variants = {
  initial: {
    scale: 0.8,
    opacity: 0,
    filter: "blur(12px)",
  },
  animate: {
    scale: 1,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.8,
      ease: "easeOut",
      delay: 0.6,
    },
  },
}

export const panelSlideIn: Variants = {
  initial: {
    x: "100%",
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
}

export const contentCrossfade: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
}

export const cardStaggerIn: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.15,
    },
  },
}

export const cardReveal: Variants = {
  initial: {
    opacity: 0,
    y: 30,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
}

export const timelineEntry: Variants = {
  initial: {
    opacity: 0,
    x: -20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
}

export const pillCascade: Variants = {
  initial: {
    scale: 0.8,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
}

export const orbitalFloat: Variants = {
  animate: {
    y: [0, -4, 0, 4, 0],
    transition: {
      duration: 4,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
}

export const nodeHoverGlow: Variants = {
  initial: {
    scale: 1,
    filter: "drop-shadow(0 0 0px rgba(100, 255, 218, 0))",
  },
  hover: {
    scale: 1.15,
    filter: "drop-shadow(0 0 8px rgba(100, 255, 218, 0.6))",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 15,
    },
  },
}
