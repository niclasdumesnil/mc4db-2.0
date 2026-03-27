import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import CardInfo from './CardInfo';
import CardText from './CardText';
import ImageWithWebp from './ImageWithWebp';
import { getFactionColor, getFactionFgColor } from '../utils/dataUtils';
import '../css/CardTooltip.css';

/**
 * Global provider for the Card Hover Modal tooltip.
 * It listens for mouseover on elements matching `.card-tip[data-code]`
 * and displays a styled hovering tooltip.
 */
export default function CardTooltip() {
    const [hoverCode, setHoverCode] = useState(null);
    const [position, setPosition] = useState({ left: -9999, top: -9999, visibility: 'hidden' });
    const [data, setData] = useState(null);

    const cache = useRef({});
    const timeoutId = useRef(null);
    const activeCode = useRef(null);
    const targetRectRef = useRef(null);
    const tooltipRef = useRef(null);

    // Mesurer et positionner dynamiquement le tooltip après le rendu
    useEffect(() => {
        if (!hoverCode || !tooltipRef.current || !targetRectRef.current) return;
        requestAnimationFrame(() => {
            if (!tooltipRef.current || !targetRectRef.current) return;
            const ttBox = tooltipRef.current.getBoundingClientRect();
            const rect = targetRectRef.current;
            
            const scrollY = window.scrollY || window.pageYOffset;
            
            let x = rect.right + 15;
            let y = rect.top + scrollY - 30; // base absolute Y
            
            // X-axis collision
            if (x + ttBox.width > window.innerWidth) {
                x = rect.left - ttBox.width - 15;
                if (x < 10) x = 10; // failsafe
            }
            
            // Y-axis bottom viewport collision
            // On calcule où le bas se trouverait sur l'écran visible :
            const screenY = y - scrollY; 
            if (screenY + ttBox.height > window.innerHeight) {
                // On remonte le tooltip pour que son bas touche (presque) le bas de l'écran
                y = scrollY + window.innerHeight - ttBox.height - 15;
            }
            
            // Y-axis top window collision
            if (y < scrollY + 10) y = scrollY + 10;

            setPosition({ left: x, top: y, visibility: 'visible' });
        });
    }, [hoverCode, data]);

    useEffect(() => {
        function onMouseOver(e) {
            const target = e.target.closest('.card-tip[data-code]');
            if (!target) return;

            const code = target.getAttribute('data-code');
            if (!code) return;

            if (timeoutId.current) clearTimeout(timeoutId.current);

            activeCode.current = code;

            // Small delay before showing to prevent flashing when passing over links
            timeoutId.current = setTimeout(() => {
                if (activeCode.current !== code) return;

                targetRectRef.current = target.getBoundingClientRect();
                setPosition({ left: -9999, top: -9999, visibility: 'hidden' });
                setHoverCode(code);

                // Fetch Data
                if (cache.current[code]) {
                    setData(cache.current[code]);
                } else {
                    setData(null); // Show loading state briefly
                    const locale = localStorage.getItem('mc_locale') || 'en';
                    const localeParam = locale !== 'en' ? `?locale=${locale}` : '';

                    fetch(`/api/public/card/${code}${localeParam}`)
                        .then(res => res.json())
                        .then(json => {
                            if (!json.error) {
                                cache.current[code] = json;
                                if (activeCode.current === code) {
                                    setData(json);
                                }
                            }
                        })
                        .catch(err => console.error('Failed to load card tooltip', err));
                }
            }, 300);
        }

        function onMouseOut(e) {
            const target = e.target.closest('.card-tip[data-code]');
            if (!target) return;
            // Don't hide if the mouse is still inside the same .card-tip element
            // (e.g. moving from the <a> to a child <span>)
            if (target.contains(e.relatedTarget)) return;
            activeCode.current = null;
            if (timeoutId.current) clearTimeout(timeoutId.current);
            setHoverCode(null);
        }

        document.body.addEventListener('mouseover', onMouseOver, true);
        document.body.addEventListener('mouseout', onMouseOut, true);

        return () => {
            document.body.removeEventListener('mouseover', onMouseOver, true);
            document.body.removeEventListener('mouseout', onMouseOut, true);
            if (timeoutId.current) clearTimeout(timeoutId.current);
        };
    }, []);

    if (!hoverCode) return null;

    return createPortal(
        <div
            ref={tooltipRef}
            className="card-tooltip"
            style={{
                left: position.left,
                top: position.top,
                visibility: position.visibility,
                '--tooltip-faction': data ? getFactionColor(data.faction_code) : '#374151'
            }}
        >
            {!data ? (
                <div className="card-tooltip__loading">Loading...</div>
            ) : (
                <TooltipContent card={data} />
            )}
        </div>,
        document.body
    );
}

export function TooltipContent({ card, isLink = false }) {
    const factionColor = getFactionColor(card.faction_code);
    const factionFgColor = getFactionFgColor(card.faction_code);

    const locale = localStorage.getItem('mc_locale') || 'en';
    const langDir = locale === 'fr' ? 'FR' : 'EN';

    return (
        <>
            <div className="card-tooltip__header">
                <div className="card-tooltip__title-block">
                    <h4 className="card-tooltip__title tw-flex tw-items-center tw-flex-wrap tw-gap-1" style={{ color: factionFgColor }}>
                        {card.is_unique ? <span className="icon-unique cl-unique-icon text-[14px]" title="Unique" /> : null}
                        {isLink ? (
                            <a href={`/card/${card.code}`} className="tw-no-underline hover:tw-underline" style={{ color: factionFgColor }}>
                                {card.name}
                            </a>
                        ) : (
                            card.name
                        )}
                        {(!card.is_unique && card.quantity > 0) ? <span className="cl-qty tw-ml-1 tw-text-gray-400 tw-text-sm">(x{card.quantity})</span> : null}
                        {card.subname ? <span className="card-tooltip__subname tw-mr-1"> {card.subname}</span> : null}
                        {card.pack_environment === 'current' ? (
                            <span className="mc-badge mc-badge-current tw-ml-1">Current</span>
                        ) : null}
                        {(card.pack_creator || (card.creator && card.creator !== 'FFG')) ? (
                            String(card.pack_creator || card.creator).split(/[,&]/).map(c => c.trim()).filter(Boolean).map((c, i) => <span key={i} className="mc-badge mc-badge-creator tw-ml-1">{c}</span>)
                        ) : null}
                        {card.alt_art ? (
                            <span className="mc-badge mc-badge-altart tw-ml-1">Alt Art</span>
                        ) : null}
                    </h4>

                    {/* Stats moved beneath the card title */}
                    <div className="card-tooltip__stats tw-mt-2">
                        <CardInfo card={card} showSpoilers={false} />
                    </div>
                </div>

                <div className="card-tooltip__image-box tw-flex tw-gap-2 tw-items-start">
                    <div className="tw-flex-1">
                        <ImageWithWebp
                            src={card.imagesrc}
                            alt={card.name}
                            locale={locale}
                            langDir={langDir}
                        />
                    </div>
                    {(card.linked_card?.imagesrc || card.backimagesrc) && (
                        <div className="tw-flex-1">
                            <ImageWithWebp
                                src={card.linked_card?.imagesrc || card.backimagesrc}
                                alt={`${card.name} Back`}
                                locale={locale}
                                langDir={langDir}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="card-tooltip__body">
                {card.text && (
                    <div className="card-tooltip__text-box">
                        <CardText card={card} showSpoilers={false} />
                    </div>
                )}

                <div className="card-tooltip__footer">
                    {card.pack_name} #{card.position}
                </div>
            </div>
        </>
    );
}
