import React from 'react';
import { Platform } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

export type CareScene = 'records' | 'telecare' | 'dispatch';
const ink = '#193F33', green = '#4B8A60', pale = '#C9DDB9', skin = '#A96643', cream = '#FAF9F1';

/** Original, scalable editorial artwork. No network or raster assets required. */
export default function CareIllustration({ scene }: { scene: CareScene }) {
  return <Svg width="100%" height="100%" viewBox="0 0 360 330" {...(Platform.OS === 'web' ? { 'aria-hidden': true as const } : { accessible: false })}>
    <Path d="M20 250C-10 186 42 119 81 106C103 28 191 11 245 53C324 39 366 111 337 172C373 231 322 300 262 292L78 299C44 302 24 285 20 250Z" fill="#DCE7D2" />
    <Path d="M5 301C92 286 225 310 355 291" stroke="#BDCFB2" strokeWidth="1.5" fill="none" />
    <G stroke="#8AAA7B" strokeWidth="1.5" fill="none">
      <Path d="M30 287L37 212M36 250C9 249 12 228 13 226C30 225 38 237 36 250M36 237C57 235 58 215 57 212C42 216 36 226 36 237" />
      <Path d="M324 289L316 246M319 265C340 267 342 250 342 248C329 247 322 255 319 265" />
    </G>
    {scene === 'records' && <>
      <G rotation="9" origin="230,160">
        <Rect x="174" y="48" width="136" height="208" rx="15" fill={ink} />
        <Rect x="181" y="56" width="122" height="191" rx="10" fill={cream} />
        <Rect x="216" y="56" width="52" height="9" rx="4" fill={ink} />
        <Rect x="195" y="86" width="31" height="31" rx="8" fill={pale} />
        <Path d="M205 101H217M211 95V107" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        <Path d="M239 92H283M239 102H269M195 134H284M195 145H262" stroke="#BECAB8" strokeWidth="5" strokeLinecap="round" />
        <Rect x="194" y="164" width="94" height="58" rx="8" fill="#EAF0E3" />
        <Path d="M200 194H216L224 179L235 208L245 185L252 194H281" stroke={green} strokeWidth="2.5" fill="none" />
      </G>
      <Path d="M76 272L79 192L125 190L142 277L123 293L106 229L101 292H76Z" fill={ink} />
      <Path d="M77 291L98 291L98 301H65C62 295 70 292 77 291M122 290L139 281L149 293L121 305L116 300Z" fill={ink} />
      <Path d="M81 120C60 125 55 151 60 177L79 201L132 196L129 145L149 164L171 144L164 134L146 143L125 120Z" fill={green} />
      <Path d="M81 138L77 166L106 178" fill="none" stroke={pale} strokeWidth="3" strokeLinecap="round" />
      <Path d="M106 170L122 176L118 187L102 180ZM163 135L171 124L177 128L174 140L169 146Z" fill={skin} />
      <Path d="M91 107L88 126Q101 139 111 123L108 105" fill={skin} />
      <Ellipse cx="99" cy="89" rx="23" ry="29" fill={skin} />
      <Path d="M75 94C63 67 82 49 102 53C132 51 135 83 118 106L112 79C97 86 90 74 87 74L83 98Z" fill={ink} />
      <Circle cx="83" cy="96" r="6" fill={skin} />
      <Path d="M102 105Q108 109 114 102" fill="none" stroke="#603D2C" strokeWidth="1.5" />
      <G rotation="-10" origin="155,215"><Rect x="118" y="185" width="72" height="60" rx="5" fill="#F8F7F0" stroke="#A9BF9B" />
        <Path d="M132 201H175M132 209H163M132 225H151" stroke="#A9BF9B" strokeWidth="3" strokeLinecap="round" />
        <Circle cx="174" cy="238" r="16" fill={green} /><Path d="M167 238L172 243L182 232" stroke={cream} strokeWidth="2.5" fill="none" /></G>
    </>}
    {scene === 'telecare' && <>
      <Rect x="129" y="38" width="155" height="233" rx="22" fill={ink} />
      <Rect x="137" y="46" width="139" height="217" rx="15" fill={cream} />
      <Rect x="184" y="47" width="47" height="8" rx="4" fill={ink} />
      <Path d="M151 207C150 167 166 142 206 143C245 144 263 169 263 207Z" fill={green} />
      <Path d="M177 152L190 188L204 173L220 187L234 153L216 142H192Z" fill={cream} />
      <Path d="M194 130V151Q205 166 216 151V129" fill={skin} />
      <Ellipse cx="205" cy="110" rx="26" ry="33" fill={skin} />
      <Path d="M179 118C164 87 183 68 207 72C237 68 248 97 230 124L226 96C202 101 194 85 189 94L186 120Z" fill={ink} />
      <Circle cx="183" cy="116" r="6" fill={skin} />
      <Path d="M202 128Q210 133 217 125" stroke="#603D2C" strokeWidth="1.5" fill="none" />
      <Path d="M180 157C170 186 181 198 191 184M231 157V187" stroke={ink} strokeWidth="2" fill="none" />
      <Circle cx="231" cy="191" r="5" fill={ink} />
      <Circle cx="173" cy="235" r="13" fill={pale} /><Circle cx="207" cy="235" r="13" fill="#B65E47" /><Circle cx="241" cy="235" r="13" fill={pale} />
      <Path d="M200 236Q207 229 214 236" stroke={cream} strokeWidth="3" fill="none" />
      <Path d="M167 232H175V239H167ZM175 234L179 231V240L175 237M239 230V238M236 238H242" stroke={ink} fill="none" strokeWidth="1.5" />
      <Path d="M64 287L71 203L107 201L117 287H98L88 237L84 287Z" fill={ink} />
      <Path d="M68 285H86L85 299H54Q51 291 68 285M98 285H118L126 298H97Z" fill={ink} />
      <Path d="M61 146Q80 127 104 145L113 179L147 168L152 182L110 202L95 184L100 215L65 212Z" fill="#8EB07C" />
      <Path d="M145 168L156 161L164 168L153 182Z" fill={skin} />
      <Path d="M76 128L75 146Q88 156 96 141L94 125" fill={skin} />
      <Ellipse cx="83" cy="111" rx="21" ry="25" fill={skin} />
      <Path d="M62 115C43 85 73 74 89 82C114 79 118 106 102 127L96 101L72 99L70 120Z" fill={ink} />
      <Rect x="35" y="49" width="68" height="40" rx="12" fill={cream} />
      <Path d="M90 87L91 98L79 87" fill={cream} /><Path d="M48 69H58L64 59L72 79L78 67H90" stroke={green} strokeWidth="2" fill="none" />
    </>}
    {scene === 'dispatch' && <>
      <Path d="M54 285L129 238L226 263L307 202M62 173L134 192L193 151L310 170M118 107L160 143M205 266L223 302" stroke={cream} strokeWidth="16" fill="none" />
      <Path d="M213 254L268 220L260 191L301 164" stroke="#81A46D" strokeWidth="3" strokeDasharray="6 7" fill="none" />
      <Path d="M300 128C271 128 279 154 300 175C321 154 329 128 300 128Z" fill={green} /><Circle cx="300" cy="144" r="6" fill={cream} />
      <Circle cx="87" cy="251" r="43" fill={cream} stroke={ink} strokeWidth="4" /><Circle cx="252" cy="251" r="43" fill={cream} stroke={ink} strokeWidth="4" />
      <Path d="M87 251L132 183L166 251H87L143 206H225L252 251M132 183H118M225 206L215 178L231 175" stroke={green} strokeWidth="6" strokeLinejoin="round" fill="none" />
      <Rect x="194" y="101" width="55" height="66" rx="8" fill="#DBAE59" transform="rotate(-8 194 101)" />
      <Path d="M216 119V143M204 131H228" stroke={cream} strokeWidth="6" />
      <Path d="M163 151L145 193L191 205L174 246L188 252L216 199Q221 189 207 182L184 172L188 148" fill={ink} />
      <Path d="M175 246L188 247L194 262L168 262Q163 255 175 246" fill={ink} />
      <Path d="M151 97C164 86 184 94 193 113L200 148L181 170L145 155L151 129L126 165L109 159Z" fill={green} />
      <Path d="M155 123L171 143L192 135" stroke={pale} strokeWidth="3" fill="none" />
      <Path d="M110 159L98 168L104 175L122 166M191 135L207 137L211 147L196 148" fill={skin} />
      <Path d="M160 85L160 102L178 111L183 86" fill={skin} />
      <Ellipse cx="170" cy="70" rx="22" ry="26" fill={skin} />
      <Path d="M146 70Q139 38 169 36Q196 35 198 62L146 70Z" fill={ink} />
      <Path d="M148 64L202 59M161 44L160 58M174 42L174 56" stroke={pale} strokeWidth="2" />
      <Path d="M191 67L191 85L182 92" stroke={ink} strokeWidth="2" fill="none" />
      <G><Circle cx="67" cy="96" r="27" fill={cream} /><Path d="M67 80V97L77 104" stroke={green} strokeWidth="2.5" strokeLinecap="round" fill="none" /></G>
    </>}
  </Svg>;
}
