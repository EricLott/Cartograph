# Design System & Aesthetic Guidelines

## Aesthetic Vision
**Cartograph** isn't just a tool; it's a **premium architect's workbench**. The UI must feel sophisticated, futuristic (but functional), and "high-gravity."

### Core Design Principles
1. **The "Glassmorphism" Aesthetic**: Use depth, blur, and subtle transparency to create a layered, multi-dimensional workspace.
2. **High-Contrast Dark Mode**: Focus on deep charcoals and blacks (not just grays) with high-vibrance accents.
3. **Motion is Meaningful**: Micro-animations and smooth transitions (e.g., Spring/Framer Motion) define the "feel" of a high-end application.
4. **Data Density with Breathing Room**: The app must handle complex task structures without feeling cluttered, using white space and typography hierarchy effectively.

---

## 🎨 Color Palette
* **Deep Space (Background)**: `#0D0D11` / `#121218`
* **Surface (Glass)**: `rgba(30, 30, 45, 0.6)` with `backdrop-filter: blur(12px)`
* **Vibrant Accents**:
  * **Electric Violet**: `#8B5CF6` (Primary action, progress)
  * **Neon Cyan**: `#06B6D4` (Info, secondary action)
  * **Emerald Glow**: `#10B981` (Success, complete)
  * **Sunset Amber**: `#F59E0B` (Warning)
  * **Crimson Pulse**: `#EF4444` (Error, blocker)
* **Text**:
  * **Primary**: `#F8FAFC` (Slate 50)
  * **Secondary**: `#94A3B8` (Slate 400)
  * **Muted**: `#475569` (Slate 600)

---

## 🔡 Typography
* **Font Family**: `Inter` (Sans-serif) or `Outfit` (Modern/Geometric).
* **Code/Metadata**: `JetBrains Mono` or `Fira Code` for technical details.
* **Weights**: Use `600/700` for headers and `400` for body text.

---

## 🧩 UI Components & Patterns
* **Cards**: Low-radius corners (8-12px), subtle 1px border (`rgba(255, 255, 255, 0.1)`), and "lift" effect on hover.
* **Badges**: Pill-shaped, high-contrast, low-opacity background with vibrant text.
* **Active Statuses**: Pulse animations for "In Progress" or "Active" items.
* **Skeleton States**: Shimmering gradients for loading components to maintain "active" feel.

---

## ⚡ Micro-Animations (Guidelines)
* **Hover**: Smooth transitions (200ms) for background colors and box-shadows.
* **Expansion**: Accordion/drawer expansions should use easing (e.g., `ease-out`) to feel fluid.
* **State Changes**: When a task moves from "Todo" to "In Progress," use a slight "pop" or slide animation.
* **Success Events**: Subtle particle or glow effects when a major milestone is reached.

---

## Standard for AI Agents
When generating UI components or modifying CSS (e.g., `index.css`), **always** adhere to these values. If a requested change would break these aesthetic standards, **propose a "Premium" alternative** rather than just implementing a basic fix.
