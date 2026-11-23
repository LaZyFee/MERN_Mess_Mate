# MealMate COMPONENTS.md

> One line per component: Name · path · props (required*) · use-for. Flagged items contain inline SVG (to convert in T0.8).
> ⚠ Some files import via aliased subfolders (`@/components/shared/buttons/Button`) that don't match actual paths — those imports will be fixed in T0.8 to the real flat paths (`@/components/shared/Button`).
> Duplicates to resolve (pick ONE): Breadcrumb.jsx vs Breadcrumbs.js; FileInput.jsx vs FileUpload.js vs ImageUpload.js; ConfirmationModal.jsx vs DeleteConfirmationModal.js; RateLimitCatcher.jsx vs RateLimitListener.jsx.

## shared/
- Button · shared/Button.jsx · variant,size,isFullWidth,isRound,isLoading,isDisabled,hasShadow,hasHoverTranslate,leftIcon,rightIcon,type,ariaLabel,href,as · all buttons. [FLAG SVG spinner → LuLoader]
- IconButton · shared/IconButton.jsx · variant,size,isRound,isDisabled,icon*,ariaLabel · icon-only buttons
- Input · shared/Input.jsx · label,variant,size,isInvalid,isDisabled,isBlocked,isRequired,errorMessage,helperText,leftElement,rightElement,align · text inputs
- Textarea · shared/Textarea.jsx · same as Input · multi-line text
- Select · shared/Select.jsx · custom dropdown (portal), options, isSearchable, phone flags built in · dropdowns [FLAG SVG chevrons]
- MultiSelect · shared/MultiSelect.jsx · options,isSearchable,variant,size,validation props · multi pick [FLAG SVG]
- Checkbox · shared/Checkbox.jsx · isChecked,defaultChecked,isChecked,size,label,align,validation props · checkboxes [FLAG SVG check]
- Radio · shared/Radio.jsx · isChecked,defaultChecked,name,label,size,validation props · single radio
- RadioGroup · shared/RadioGroup.jsx · name,options*,value,orientation,onChange,label,validation props · radio group
- Card · shared/Card.jsx · variant(elevated|outlined|filled|unstyled),padding,isHoverable,isClickable,header,footer · content containers. ⚠ uses literal bg-white/borders → fix to vars in T0.8
- Alert · shared/Alert.jsx · status(info|success|warning|error),title,isDismissible,onDismiss · inline notices [FLAG SVG icons]
- Badge · shared/Badge.jsx · variant,colorScheme,size,isRounded,icon · generic chips
- StatusBadge · shared/StatusBadge.js · status, configs in STATUS_CONFIGS (driver/document/payment/online) · status chips with icon+color — EXTEND with mealmate statuses (expense, money, period, statementItem, outbox, ticket, membership) in T0.8
- Avatar · shared/Avatar.jsx · src,alt,name(initials fallback),size,hasBorder,status,isSquare,bgColor · user images
- Skeleton · shared/Skeleton.jsx · variant(text|circle|rect),width,height,isAnimated · loading placeholders
- Loading · shared/Loading.jsx · size,color,fullScreen,text · spinner (imports TravelLoader — verify exists)
- Progress · shared/Progress.jsx · value*,min,max,size,variant(line|circle),colorScheme,hasStripe,isIndeterminate,label,showPercentage · progress [FLAG SVG circle]
- Tabs · shared/Tabs.jsx + TabList/Tab/TabPanels/TabPanel · variant(line…),value,onChange (or uncontrolled), sliding indicator · tabbed UIs
- Table · shared/Table.jsx · full-featured DataTable: columns, fetchData/pagination/search/sort/filters/export CSV/PDF, column toggle + EmptyState/ErrorState/LoadingSkeleton/SearchInput/FilterBar exports · data tables. T0.8: add stacked-card mode <md
- Pagination · shared/Pagination.jsx · page controls (chevrons, ellipsis) · paged lists
- ModalStepper · shared/ModalStepper.jsx · steps[],currentStep*,onStepClick · multi-step forms
- PasswordStrengthMeter · shared/PasswordStrengthMeter.jsx · password*, exports getPasswordStrength(password) · signup/change-password
- ProfileAvatarUpload · shared/ProfileAvatarUpload.js · avatar upload w/ preview (POSTs to profile-pic) · profile page
- FileInput · shared/FileInput.jsx · file picker w/ drag-drop, previews [FLAG SVG] · receipt/attachment uploads (PREFERRED over FileUpload/ImageUpload)
- FileUpload · shared/FileUpload.js · label,accept,maxSizeMB,value,onChange,multiple,preview · alt file picker (duplicate — prefer FileInput)
- ImageUpload · shared/ImageUpload.js · images[] gallery manager (duplicate — prefer FileInput)
- DateTimePicker · shared/DateTimePicker.jsx · portal calendar/time picker · date+time fields
- TextEditor · shared/TextEditor.jsx · Quill wrapper, value/onChange, validation props · rich text (notes)
- FaqAccordion · shared/FaqAccordion.js · items[{question,answer}] · FAQ lists
- ScrollReveal · shared/ScrollReveal.js · children,animation,delay,threshold · scroll-in animation
- Sectionheader · shared/Sectionheader.js · rotatedLabel,eyebrow,headingLines[],ctaLabel,ctaHref,description,accentFrom/To · marketing/section headers
- BlockedFormOverlay · shared/BlockedFormOverlay.js · isBlocked,title,description,uploadHref,uploadButtonText · lock forms on prerequisites
- ThemeToggle · shared/ThemeToggle.js · className,scrolled,topbar · light/dark toggle (currently uses @/context/ThemeContext — refactor to uiStore/mm_theme cookie in T0.7)
- RateLimitCatcher · shared/RateLimitCatcher.jsx · error,reset,onRetry,onClose,isOverlay · 429 full-screen UI (PREFERRED)
- RateLimitListener · shared/RateLimitListener.jsx · (duplicate — prefer RateLimitCatcher)
- Toast · shared/Toast.jsx · toast rendering incl. success/error/warning/loading [FLAG SVG]
- ToastProvider · shared/ToastProvider.jsx · wraps app; useToast() → showToast,confirm,prompt,fire,loading,update,queue · all notifications + confirm/prompt dialogs

## modals/
- Modal · modals/Modal.jsx · isOpen*,onClose*,header,footer,size(3xl…),isCentered,closeOnOverlayClick,closeOnEsc,hasCloseButton,scrollBehavior · ALL dialogs; already bottom-sheet on mobile (rounded top, items-end). T0.8: 90dvh + safe-area
- ConfirmationModal · modals/ConfirmationModal.jsx · isOpen,onClose,onConfirm,title,message,details,isLoading,confirmLabel… + feature/action gating · destructive confirms (PREFERRED)
- DeleteConfirmationModal · modals/DeleteConfirmationModal.js · isOpen,onClose,onConfirm,title,itemName,details,isLoading · (duplicate — prefer ConfirmationModal)
- Dropdown · modals/Dropdown.jsx · trigger,items,placement,size · menus
- Tooltip · modals/Tooltip.jsx · hover tooltip — T0.8: make tap-friendly

## guards/
- PermissionGuard · guards/PermissionGuard.js · feature,action,requiredPermissions[],requiredAnyPermission[],permission('x.y'),fallback,showLoading · role-gated UI (re-wire to 5-tier mealmate roles via groupStore in T0.7/T0.12)

## layouts/ & socket/
- ProtectedLayout · layouts/ProtectedLayout.js · auth-gated layout shell (Next.js — keep, wire to (app) layout)
- ProtectedComponent · layouts/ProtectedComponent.js · inline auth gate [FLAG SVG]
- RoleBasedLayout · layouts/RoleBasedLayout.js · role → layout switcher
- Sidebar · layouts/Sidebar.js · desktop nav sidebar
- TopBar · layouts/TopBar.js · app header: search, bell, user menu — rebuild for MealMate in T0.6
- SocketInitializer · socket/SocketInitializer.js · connects socket with token on mount (refactor: cookie/BFF handshake per §8.6)
