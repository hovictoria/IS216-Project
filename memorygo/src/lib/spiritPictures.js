// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /lib/spiritPictures.js
// purpose:    the 2D drawing of a Spirit (src/assets/spirits/<id>.svg), for small pictures: the Me page,
//             the nav's round picture, the Edit profile picker
// usage:      pictureOf('kopi') → the image's URL (or undefined if there's no drawing)
// ----------------------------------------------------------------------------------------------------------

const pictures = import.meta.glob('@/assets/spirits/*.svg', { eager: true, import: 'default' })

export const pictureOf = (id) => pictures[`/src/assets/spirits/${id}.svg`]
