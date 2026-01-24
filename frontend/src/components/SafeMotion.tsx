'use client';

import React, { ReactNode } from 'react';
import { motion, AnimatePresence, type Variant, type Transition, type VariantLabels, type TargetAndTransition, type MotionProps } from 'framer-motion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';

interface SafeMotionProps {
  children?: ReactNode;
  class_name?: string;
  initial?: boolean | VariantLabels | TargetAndTransition;
  animate?: VariantLabels | TargetAndTransition;
  exit?: VariantLabels | TargetAndTransition;
  while_in_view?: VariantLabels | TargetAndTransition;
  viewport?: MotionProps['viewport'];
  transition?: Transition;
  as?: 'div' | 'section' | 'button' | 'footer' | 'p' | 'li';
  // Support both camelCase (for compatibility) and snake_case (our convention)
  onClick?: (e: React.MouseEvent) => void;
  on_click?: (e: React.MouseEvent) => void;
  while_hover?: VariantLabels | TargetAndTransition;
  while_tap?: VariantLabels | TargetAndTransition;
  while_drag?: VariantLabels | TargetAndTransition;
  while_focus?: VariantLabels | TargetAndTransition;
  motion_key?: string | number;
  disabled?: boolean;
  layout?: boolean | 'position' | 'size' | 'preserve-aspect';
  variants?: Record<string, Variant>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  style?: React.CSSProperties;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

const SafeMotion: React.FC<SafeMotionProps> = ({
  children,
  class_name,
  initial,
  animate,
  exit,
  while_in_view,
  viewport,
  transition,
  as = 'div',
  onClick,
  on_click,
  while_hover,
  while_tap,
  while_drag,
  while_focus,
  motion_key,
  disabled,
  layout,
  variants,
  onMouseEnter,
  onMouseLeave,
  style,
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop
}) => {
  const { isMobile, get_safe_motion_props } = useMobileSafeMotion();

  // Support both camelCase and snake_case by preferring snake_case
  const click_handler = on_click || onClick;

  if (isMobile) { // Mobile detection enabled
    // Removed excessive logging - was spamming console
    // On mobile, use regular HTML elements instead of motion elements
    // Ensure elements are visible by default (override animation opacity)
    const mobileSafeStyle = {
      ...style,
      opacity: style?.opacity ?? 1, // Default to visible unless explicitly hidden
    };

    const mobileSafeProps = {
      className: class_name,
      onClick: click_handler,
      onMouseEnter,
      onMouseLeave,
      key: motion_key,
      disabled,
      style: mobileSafeStyle,
      // Drag handlers for mobile
      draggable,
      onDragStart,
      onDragEnd,
      onDragOver,
      onDragLeave,
      onDrop
    };

    if (as === 'section') {
      return (
        <section {...mobileSafeProps}>
          {children}
        </section>
      );
    } else if (as === 'button') {
      return (
        <button {...mobileSafeProps}>
          {children}
        </button>
      );
    } else if (as === 'footer') {
      return (
        <footer {...mobileSafeProps}>
          {children}
        </footer>
      );
    }

    // Default to div
    return (
      <div {...mobileSafeProps}>
        {children}
      </div>
    );
  }

  // Render as motion element for desktop
  if (as === 'div') {
    return (
      <motion.div
        key={motion_key}
        className={class_name}
        initial={initial}
        animate={animate}
        exit={exit}
        whileInView={while_in_view}
        viewport={viewport}
        transition={transition}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={click_handler}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        whileHover={while_hover}
        whileTap={while_tap}
        layout={layout}
        variants={variants}
        style={style}
      >
        {children}
      </motion.div>
    );
  } else if (as === 'section') {
    return (
      <motion.section
        key={motion_key}
        className={class_name}
        initial={initial}
        animate={animate}
        exit={exit}
        whileInView={while_in_view}
        viewport={viewport}
        transition={transition}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={click_handler}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        whileHover={while_hover}
        whileTap={while_tap}
        layout={layout}
        variants={variants}
        style={style}
      >
        {children}
      </motion.section>
    );
  } else if (as === 'button') {
    return (
      <motion.button
        key={motion_key}
        className={class_name}
        initial={initial}
        animate={animate}
        exit={exit}
        whileInView={while_in_view}
        viewport={viewport}
        transition={transition}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={click_handler}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        whileHover={while_hover}
        whileTap={while_tap}
        disabled={disabled}
        layout={layout}
        variants={variants}
        style={style}
      >
        {children}
      </motion.button>
    );
  } else if (as === 'footer') {
    return (
      <motion.footer
        key={motion_key}
        className={class_name}
        initial={initial}
        animate={animate}
        exit={exit}
        whileInView={while_in_view}
        viewport={viewport}
        transition={transition}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={click_handler}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        whileHover={while_hover}
        whileTap={while_tap}
        layout={layout}
        variants={variants}
        style={style}
      >
        {children}
      </motion.footer>
    );
  } else if (as === 'p') {
    return (
      <motion.p
        key={motion_key}
        className={class_name}
        initial={initial}
        animate={animate}
        exit={exit}
        whileInView={while_in_view}
        viewport={viewport}
        transition={transition}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={click_handler}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        whileHover={while_hover}
        whileTap={while_tap}
        layout={layout}
        variants={variants}
        style={style}
      >
        {children}
      </motion.p>
    );
  } else if (as === 'li') {
    return (
      <motion.li
        key={motion_key}
        className={class_name}
        initial={initial}
        animate={animate}
        exit={exit}
        whileInView={while_in_view}
        viewport={viewport}
        transition={transition}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={click_handler}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        whileHover={while_hover}
        whileTap={while_tap}
        layout={layout}
        variants={variants}
        style={style}
      >
        {children}
      </motion.li>
    );
  }

  // Fallback to div
  return (
    <motion.div
      key={motion_key}
      className={class_name}
      initial={initial}
      animate={animate}
      whileInView={while_in_view}
      viewport={viewport}
      transition={transition}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      whileHover={while_hover}
      whileTap={while_tap}
      layout={layout}
      variants={variants}
      style={style}
    >
      {children}
    </motion.div>
  );
};

// Create SafeMotion.div, SafeMotion.section, etc. to match motion API
type SafeMotionElementProps = Omit<SafeMotionProps, 'as'>;

interface SafeMotionComponent extends React.FC<SafeMotionProps> {
  div: React.FC<SafeMotionElementProps>;
  section: React.FC<SafeMotionElementProps>;
  button: React.FC<SafeMotionElementProps>;
  footer: React.FC<SafeMotionElementProps>;
  p: React.FC<SafeMotionElementProps>;
  li: React.FC<SafeMotionElementProps>;
}

const SafeMotionWithElements = SafeMotion as SafeMotionComponent;

SafeMotionWithElements.div = (props: SafeMotionElementProps) => <SafeMotion {...props} as="div" />;
SafeMotionWithElements.section = (props: SafeMotionElementProps) => <SafeMotion {...props} as="section" />;
SafeMotionWithElements.button = (props: SafeMotionElementProps) => <SafeMotion {...props} as="button" />;
SafeMotionWithElements.footer = (props: SafeMotionElementProps) => <SafeMotion {...props} as="footer" />;
SafeMotionWithElements.p = (props: SafeMotionElementProps) => <SafeMotion {...props} as="p" />;
SafeMotionWithElements.li = (props: SafeMotionElementProps) => <SafeMotion {...props} as="li" />;

export { AnimatePresence };
export { SafeMotionWithElements as SafeMotion };
export default SafeMotionWithElements;
