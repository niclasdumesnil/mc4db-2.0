-- Side Deck Slot tables
-- Run this once to create the tables needed for side deck management.

-- sidedeckslot: side deck cards for private decks
CREATE TABLE IF NOT EXISTS `sidedeckslot` (
  `id`        INT      NOT NULL AUTO_INCREMENT,
  `deck_id`   INT      NOT NULL,
  `card_id`   INT      NOT NULL,
  `quantity`  SMALLINT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sidedeckslot` (`deck_id`, `card_id`),
  KEY `idx_sidedeckslot_deck_id` (`deck_id`),
  CONSTRAINT `fk_sidedeckslot_deck`
    FOREIGN KEY (`deck_id`) REFERENCES `deck` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sidedeckslot_card`
    FOREIGN KEY (`card_id`) REFERENCES `card` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- sidedecklistslot: side deck cards for published decklists
CREATE TABLE IF NOT EXISTS `sidedecklistslot` (
  `id`           INT      NOT NULL AUTO_INCREMENT,
  `decklist_id`  INT      NOT NULL,
  `card_id`      INT      NOT NULL,
  `quantity`     SMALLINT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sidedecklistslot` (`decklist_id`, `card_id`),
  KEY `idx_sidedecklistslot_decklist_id` (`decklist_id`),
  CONSTRAINT `fk_sidedecklistslot_decklist`
    FOREIGN KEY (`decklist_id`) REFERENCES `decklist` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sidedecklistslot_card`
    FOREIGN KEY (`card_id`) REFERENCES `card` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
