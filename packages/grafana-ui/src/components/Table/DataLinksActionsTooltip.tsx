import { autoUpdate, useDismiss, useFloating, useInteractions } from '@floating-ui/react';
import { useEffect, useMemo, type ReactNode } from 'react';

import { type ActionModel, type LinkModel } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';

import { useTheme2 } from '../../themes/ThemeContext';
import { getPositioningMiddleware } from '../../utils/floating';
import { Portal } from '../Portal/Portal';
import { VizTooltipFooter } from '../VizTooltip/VizTooltipFooter';
import { VizTooltipWrapper } from '../VizTooltip/VizTooltipWrapper';

import { type DataLinksActionsTooltipCoords } from './cellUtils';

const SCROLL_DISMISS_DISTANCE = 80;

interface Props {
  links: LinkModel[];
  actions?: ActionModel[];
  value?: ReactNode;
  coords: DataLinksActionsTooltipCoords;
  onTooltipClose?: () => void;
  /** Focuses the link menu when opened by the refreshed table. */
  tableRefreshEnabled?: boolean;
}

/**
 *
 * @internal
 */
export const DataLinksActionsTooltip = ({
  links,
  actions,
  value,
  coords,
  onTooltipClose,
  tableRefreshEnabled,
}: Props) => {
  const theme = useTheme2();
  const placement = 'right-start';

  // the order of middleware is important!
  const middleware = getPositioningMiddleware(placement);

  const virtual = useMemo(() => {
    const { clientX, clientY, contextElement } = coords;
    const initialRect = contextElement?.getBoundingClientRect();

    return {
      contextElement,
      getBoundingClientRect() {
        const rect = contextElement?.getBoundingClientRect();
        const x = clientX + (rect && initialRect ? rect.left - initialRect.left : 0);
        const y = clientY + (rect && initialRect ? rect.top - initialRect.top : 0);
        return {
          width: 0,
          height: 0,
          x,
          y,
          top: y,
          left: x,
          right: x,
          bottom: y,
        };
      },
    };
  }, [coords]);

  useEffect(() => {
    if (!virtual.contextElement || !onTooltipClose) {
      return;
    }

    let dismissed = false;
    const onScroll = () => {
      if (dismissed) {
        return;
      }
      const rect = virtual.getBoundingClientRect();
      if (
        !virtual.contextElement?.isConnected ||
        Math.abs(rect.left - coords.clientX) > SCROLL_DISMISS_DISTANCE ||
        Math.abs(rect.top - coords.clientY) > SCROLL_DISMISS_DISTANCE
      ) {
        dismissed = true;
        onTooltipClose();
      }
    };

    // Capture scroll events from nested table and dashboard containers too.
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [coords, onTooltipClose, virtual]);

  const refCallback = (el: HTMLDivElement) => {
    refs.setFloating(el);
    refs.setReference(virtual);
  };

  const { context, refs, floatingStyles } = useFloating({
    open: true,
    placement,
    onOpenChange: onTooltipClose,
    middleware,
    whileElementsMounted: autoUpdate,
  });

  const dismiss = useDismiss(context);

  const { getFloatingProps, getReferenceProps } = useInteractions([dismiss]);

  if (links.length === 0 && !Boolean(actions?.length)) {
    return null;
  }

  return (
    <>
      {/* TODO: we can remove `value` from this component when TableRT is fully deprecated */}
      {value}
      <Portal zIndex={theme.zIndex.tooltip}>
        <VizTooltipWrapper
          ref={refCallback}
          {...getReferenceProps()}
          {...getFloatingProps()}
          style={floatingStyles}
          menuProps={{ autoFocus: tableRefreshEnabled }}
          data-testid={selectors.components.DataLinksActionsTooltip.tooltipWrapper}
        >
          <VizTooltipFooter dataLinks={links} actions={actions} />
        </VizTooltipWrapper>
      </Portal>
    </>
  );
};

export const renderSingleLink = (link: LinkModel, children: ReactNode, className?: string): ReactNode => {
  return (
    <a
      href={link.href}
      onClick={link.onClick}
      target={link.target}
      title={link.title}
      data-testid={selectors.components.DataLinksContextMenu.singleLink}
      className={className}
    >
      {children}
    </a>
  );
};
