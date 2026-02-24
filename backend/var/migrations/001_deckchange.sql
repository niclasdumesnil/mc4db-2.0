-- deckchange table
-- Run this once to create the table needed for deck history tracking.
CREATE TABLE IF NOT EXISTS `deckchange` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `deck_id`       INT          NOT NULL,
  `date_creation` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `variation`     TEXT         NOT NULL,
  `is_saved`      TINYINT(1)   NOT NULL DEFAULT 1,
  `version`       VARCHAR(20)  NOT NULL DEFAULT '0.0',
  PRIMARY KEY (`id`),
  KEY `idx_deckchange_deck_id` (`deck_id`),
  CONSTRAINT `fk_deckchange_deck`
    FOREIGN KEY (`deck_id`) REFERENCES `deck` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
