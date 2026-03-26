import React from 'react';
import { getFactionColor, getBorderClass } from './utils/dataUtils';
import CardFooter from './components/CardFooter';
import { 
	Fingerprint, 
	Paintbrush, 
	Package, 
	Terminal,
	FileText,
	MessageSquare,
	AlertCircle
} from 'lucide-react';
import CardName from './components/CardName';
import CardInfo from './components/CardInfo';
import CardText from './components/CardText';
import CardFlavor from './components/CardFlavor';
import CardIllustrator from './components/CardIllustrator';
import CardPack from './components/CardPack';
import CardPromo from './components/CardPromo';
import ImageWithWebp from './components/ImageWithWebp';
import CardBack from './CardBack';

export default function CardFront({ card, showSpoilers, locale, langDir, preferWebpOnly }) {
	const factionColor = getFactionColor(card.faction_code);

	function readableTextColor(hex) {
		if (!hex) return '#fff';
		const h = hex.replace('#', '');
		const normalized = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
		const bigint = parseInt(normalized, 16);
		const r = (bigint >> 16) & 255;
		const g = (bigint >> 8) & 255;
		const b = bigint & 255;
		const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
		return luminance > 150 ? '#000' : '#fff';
	}

	const headerTextColor = readableTextColor(factionColor);

	return (
		<div className="card-frame">

			{/* ── Panel 1 : Titre / barre de statut ── */}
			<div className="card-frame__header" style={{ backgroundColor: factionColor, color: headerTextColor }}>
				<div className="card-frame__header-left">
					<div className="card-frame__header-dot" style={{ backgroundColor: headerTextColor }} />
					<span className="card-frame__header-system">
						{'System.'}{((card.faction_name || card.faction_code || 'basic').toUpperCase())}{' // Online'}
					</span>
				</div>
				<div className="card-frame__header-right">
					{(card.creator || card.pack_year) && (
						<span className="card-frame__header-creator">
							{(card.creator && card.creator !== '') ? card.creator : 'FFG'}{card.pack_year ? '.' + card.pack_year : ''}
						</span>
					)}
					<span className="card-frame__header-code">#{card.code}</span>
				</div>
			</div>

			{/* ── Panneaux 2 + 3 : deux colonnes ── */}
			<div className="card-frame__body">

				{/* Colonne gauche — infos */}
				<div className="card-frame__left">
					<header className="card-frame__title-area">
						<div className="card-frame__title-row">
							<div>
								<h1 className="card-frame__name">
									<CardName card={card} showSpoilers={showSpoilers} />
								</h1>
								<div className="card-frame__type-badge">TYPE: {card.type_name}</div>
							</div>
							{card.cost !== null && !['hero', 'alter_ego'].includes(card.type_code) && card.faction_code !== 'encounter' && card.type_code !== 'resource' && (
								<div className="card-frame__cost">
									<span className="card-frame__cost-label">Cost</span>
									<div className="card-frame__cost-value">{card.cost}</div>
								</div>
							)}
						</div>
					</header>

					<div className="card-frame__sections">
						<section>
							<div className="card-frame__section-label">
								<Terminal size={16} />
								<h3>Characteristics</h3>
							</div>
							<div className="card-frame__section-box">
								<CardInfo card={card} showSpoilers={showSpoilers} showType={false} />
							</div>
						</section>

						<section>
							<div className="card-frame__section-label">
								<FileText size={16} />
								<h3>Description</h3>
							</div>
							<div className="card-frame__section-box">
								<CardText card={card} showSpoilers={showSpoilers} />
							</div>
						</section>

						{card.flavor && (
							<section>
								<div className="card-frame__section-label">
									<MessageSquare size={16} />
									<h3>Flavor</h3>
								</div>
								<div className="card-frame__section-box">
									<CardFlavor card={card} showSpoilers={showSpoilers} />
								</div>
							</section>
						)}

						<section>
							{card.illustrator && (
								<>
									<div className="card-frame__section-label">
										<Paintbrush size={16} />
										<h3>Artist Reference</h3>
									</div>
									<div className="card-frame__section-box card-frame__section-box--mb">
										<CardIllustrator card={card} />
									</div>
								</>
							)}
							<div className="card-frame__section-label">
								<Package size={16} />
								<h3>Source Module</h3>
							</div>
							<div className="card-frame__section-box">
								<CardPack card={card} />
							</div>
						</section>

						{card.errata && (
							<div className="card-frame__errata">
								<AlertCircle size={15} />
								<p><strong>ERRATA:</strong> {card.errata}</p>
							</div>
						)}
					</div>
				</div>

				{/* Colonne droite — image */}
				<div className="card-frame__right">
					<div className="card-frame__section-label">
						<Fingerprint size={16} />
						<h3>Visual Reference</h3>
					</div>
					<div className="card-frame__image-wrap">
						<ImageWithWebp
							id={`card-image-${card.id}`}
							src={card.imagesrc}
							alt={card.name}
							className="tw-w-full tw-h-auto"
							locale={locale}
							langDir={langDir}
							preferWebpOnly={preferWebpOnly}
						/>
					</div>
					<div className="card-frame__promo">
						<CardPromo card={card} locale={locale} />
					</div>
				</div>
			</div>

			{/* ── Verso (si recto-verso) ── */}
			{card.linked_card && (
				<div className="card-frame__back-panel">
					<div className="card-frame__back-label">
						<span>◈ Card Back</span>
					</div>
					<CardBack card={card.linked_card} showSpoilers={showSpoilers} preferWebpOnly={preferWebpOnly} locale={locale} inline={true} />
				</div>
			)}

			{/* ── Panel 4 : Footer ── */}
			<CardFooter />
		</div>
	);
}
