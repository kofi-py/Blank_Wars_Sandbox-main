/**
 * Battle Host Definitions
 * Commentary, introduction, and personality styles for battle hosts
 */

import {
  COMMENTARY_STYLE as BARNUM_COMMENTARY,
  INTRODUCTION_STYLE as BARNUM_INTRO,
  PERSONALITY as BARNUM_PERSONALITY
} from './pt_barnum';

import {
  COMMENTARY_STYLE as HATTER_COMMENTARY,
  INTRODUCTION_STYLE as HATTER_INTRO,
  PERSONALITY as HATTER_PERSONALITY
} from './mad_hatter';

import {
  COMMENTARY_STYLE as BETTY_COMMENTARY,
  INTRODUCTION_STYLE as BETTY_INTRO,
  PERSONALITY as BETTY_PERSONALITY
} from './betty_boop';

export const HOST_DEFINITIONS = {
  pt_barnum: {
    commentary: BARNUM_COMMENTARY,
    introduction: BARNUM_INTRO,
    personality: BARNUM_PERSONALITY
  },
  mad_hatter: {
    commentary: HATTER_COMMENTARY,
    introduction: HATTER_INTRO,
    personality: HATTER_PERSONALITY
  },
  betty_boop: {
    commentary: BETTY_COMMENTARY,
    introduction: BETTY_INTRO,
    personality: BETTY_PERSONALITY
  },
} as const;
