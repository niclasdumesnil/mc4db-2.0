const { resolveImage } = require('../backend/src/utils/cardSerializer');

console.log('resolveImage(12008, "", "EN") =>', resolveImage('12008', '', 'EN'));
console.log('resolveImage(12008, "", "FR") =>', resolveImage('12008', '', 'FR'));
console.log('resolveImage(999999, "", "EN") =>', resolveImage('999999', '', 'EN'));
