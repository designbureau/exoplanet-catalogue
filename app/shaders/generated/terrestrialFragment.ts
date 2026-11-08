// @ts-nocheck
/* eslint-disable */
// GENERATED — TSL port of the original GLSL (terrestrialFragment), produced with three's GLSL→TSL
// transpiler (examples/jsm/transpiler) and then adapted: uniforms arrive as TSL
// uniform nodes via `reference()`, varyings are injected by the host material.
// This file is now the source of truth; hand-edit as needed.

export default function build( TSL: any, uniforms: any, varyings: any, lib: any ): Record<string, any> {

	const { varying, vec3, reference, atan, clamp, acos, vec2, Fn, add, smoothstep, sub, mix, abs, mul, If, select, property, float, dot, max, normalize, cross, cos, sin, min, cameraPosition, reflect, pow, vec4 } = TSL;
	const { vPosition, vSphereDir, vNormal, vWorldNormal, vWorldPosition } = varyings;
	const { u_seed, u_lod, mod289v3, mod289v4, permute, taylorInvSqrt, fade, cnoise, pnoise3d, hash, hash3, noise, noise3d, fbm, fbm3d, hiFBM, hiRidged, hiInvRidged, hiCloud, ridgedNoise, cloudNoise, enhanceContrast, voronoi, craterProfile, sobelNormal, seededPos, u_sunDirection, u_sunDirectionLocal, u_ambient, u_lavaAmbient, u_wrapRange, u_wrapPower, u_sunIntensity, u_atmosDayColor, u_atmosTwilightColor, u_atmosIntensity, u_atmosFalloff, wrapDiffuse, fresnelAmbient, planetLighting, applyAtmosphere, fbm3d_lod, ridgedNoise_lod, cloudNoise_lod } = lib;


	// undisplaced sphere direction for clouds

	const u_time = reference( 'value', 'float', uniforms[ 'u_time' ] );
	const scale = reference( 'value', 'float', uniforms[ 'scale' ] );
	const color1 = reference( 'value', 'color', uniforms[ 'color1' ] );
	const color2 = reference( 'value', 'color', uniforms[ 'color2' ] );
	const color3 = reference( 'value', 'color', uniforms[ 'color3' ] );
	const color4 = reference( 'value', 'color', uniforms[ 'color4' ] );
	const u_atmosColor = reference( 'value', 'color', uniforms[ 'u_atmosColor' ] );
	const u_cloudCoverage = reference( 'value', 'float', uniforms[ 'u_cloudCoverage' ] );
	const u_cloudOpacity = reference( 'value', 'float', uniforms[ 'u_cloudOpacity' ] );
	const u_cloudSwirl = reference( 'value', 'float', uniforms[ 'u_cloudSwirl' ] );
	const u_cloudBands = reference( 'value', 'float', uniforms[ 'u_cloudBands' ] );
	const u_cloudWarp = reference( 'value', 'float', uniforms[ 'u_cloudWarp' ] );
	const u_seaLevel = reference( 'value', 'float', uniforms[ 'u_seaLevel' ] );
	const u_continentFreq = reference( 'value', 'float', uniforms[ 'u_continentFreq' ] );
	const u_terrWarp = reference( 'value', 'float', uniforms[ 'u_terrWarp' ] );
	const u_iceCapSize = reference( 'value', 'float', uniforms[ 'u_iceCapSize' ] );
	const u_iceEdge = reference( 'value', 'float', uniforms[ 'u_iceEdge' ] );
	const u_iceWarp = reference( 'value', 'float', uniforms[ 'u_iceWarp' ] );
	const u_iceDetail = reference( 'value', 'float', uniforms[ 'u_iceDetail' ] );
	const u_coastDetail = reference( 'value', 'float', uniforms[ 'u_coastDetail' ] );
	const u_landContrast = reference( 'value', 'float', uniforms[ 'u_landContrast' ] );
	const u_displace = reference( 'value', 'float', uniforms[ 'u_displace' ] );
	const u_bumpStrength = reference( 'value', 'float', uniforms[ 'u_bumpStrength' ] );
	const u_tidallyLocked = reference( 'value', 'float', uniforms[ 'u_tidallyLocked' ] );
	const u_eyeAridEdge = reference( 'value', 'float', uniforms[ 'u_eyeAridEdge' ] );

	// sun angle where arid→terminator transition starts

	const u_eyeIceEdge = reference( 'value', 'float', uniforms[ 'u_eyeIceEdge' ] );

	// sun angle where terminator→ice transition starts

	const u_eyeIceBergDensity = reference( 'value', 'float', uniforms[ 'u_eyeIceBergDensity' ] );

	// iceberg frequency in transition zone

	const u_iceOceanPolarFade = reference( 'value', 'float', uniforms[ 'u_iceOceanPolarFade' ] );

	// 0=no cap, 1=cap fills most of night side

	const u_iceOceanEdgeNoise = reference( 'value', 'float', uniforms[ 'u_iceOceanEdgeNoise' ] );

	// 0=smooth cap edge, 1=very ragged floe-shaped edge

	const u_iceOceanCrackDepth = reference( 'value', 'float', uniforms[ 'u_iceOceanCrackDepth' ] );

	// 0=cracks invisible, 1=strong dark water in cracks

	const u_eyeVegHue = reference( 'value', 'float', uniforms[ 'u_eyeVegHue' ] );

	// hue rotation for vegetation (-0.5 to 0.5)

	const u_eyeVegSat = reference( 'value', 'float', uniforms[ 'u_eyeVegSat' ] );

	// saturation multiplier (0=grey, 1=normal, 2=vivid)

	const u_eyeMoisture = reference( 'value', 'float', uniforms[ 'u_eyeMoisture' ] );

	// terminator moisture level (0=dry, 1=lush)

	const emissiveColor = reference( 'value', 'color', uniforms[ 'emissiveColor' ] );
	const emissiveIntensity = reference( 'value', 'float', uniforms[ 'emissiveIntensity' ] );
	const u_lavaGlow = reference( 'value', 'float', uniforms[ 'u_lavaGlow' ] );
	const u_lavaCrackDepth = reference( 'value', 'float', uniforms[ 'u_lavaCrackDepth' ] );
	const u_lavaPoolSize = reference( 'value', 'float', uniforms[ 'u_lavaPoolSize' ] );
	const u_lavaHeatGrad = reference( 'value', 'float', uniforms[ 'u_lavaHeatGrad' ] );
	const u_useTextureMaps = reference( 'value', 'float', uniforms[ 'u_useTextureMaps' ] );

	// Equirectangular UV from sphere direction

	const dirToUV = /*@__PURE__*/ Fn( ( [ d ] ) => {

		const phi = atan( d.z, d.x );
		const theta = acos( clamp( d.y, - 1.0, 1.0 ) );

		return vec2( phi.div( 2.0 * 3.14159265 ).add( 0.5 ), theta.div( 3.14159265 ) );

	}, { d: 'vec3', return: 'vec2' } );

	// ── ColorDodge-style terrain with value-noise-safe frequencies ──
	// ColorDodge uses simplex noise with arbitrary frequencies up to 5.0.
	// Our value noise aliases above freq ~1.5 with 6 octaves (highest
	// octave at 1.5 * 32 = 48x). So we keep base frequencies low.

	const computeContinent = /*@__PURE__*/ Fn( ( [ p ] ) => {

		const _ret = float( 0.0 ).toVar();

		const sd = u_seed.x.mul( 100.0 );

		If( u_lod.greaterThan( 0.5 ), () => {

			// Sub 1: organic continental shapes

			const sub1 = hiCloud( p, u_continentFreq.mul( 1.0 ), sd.add( 11.4 ) );

			// Sub 2: ridged mountains at higher frequency (u_coastDetail scales)

			const sub2 = hiRidged( p, u_continentFreq.mul( add( 1.0, u_coastDetail.mul( 3.0 ) ) ), sd.add( 29.4 ) );

			// Sub 3: large-scale mixing control

			const sub3 = hiCloud( p, u_continentFreq.mul( 0.6 ), sd.add( 53.0 ) );

			// Domain warp (u_terrWarp controls strength)

			const warp = vec3( sub1.sub( 0.5 ), sub2.sub( 0.5 ), sub3.sub( 0.5 ) ).mul( u_terrWarp ).mul( 0.4 );
			const n = hiCloud( p.add( warp ), u_continentFreq.mul( 0.8 ), sd.add( 78.2 ) ).toVar();

			// Blend ridged peaks via spatial mask (u_landContrast controls mix amount)

			const mask = smoothstep( 0.3, 0.7, sub3 );
			const ridgeMix = u_landContrast.mul( 0.3 );
			n.assign( mix( n, n.mul( sub( 1.0, ridgeMix ) ).add( sub2.mul( ridgeMix ) ), mask.mul( 0.7 ) ) );

			// Contrast push: clusters landmasses, widens oceans
			// S-curve centered at sea level — steepens the land/ocean transition

			const c = n.sub( u_seaLevel );
			n.assign( u_seaLevel.add( c.mul( add( 1.0, abs( c ).mul( 2.0 ) ) ) ) );
			n.assign( clamp( n, 0.0, 1.0 ) );

			_ret.assign( n );

		} ).Else( () => {

			const wp = p.add( mul( 0.3, vec3( noise3d( p.mul( 0.2 ) ), noise3d( p.mul( 0.2 ).add( vec3( 5.2 ) ) ), noise3d( p.mul( 0.2 ).add( vec3( 9.7 ) ) ) ) ) );

			_ret.assign( noise3d( wp.mul( u_continentFreq ) ).mul( 0.65 ).add( noise3d( wp.mul( u_continentFreq ).mul( 0.67 ).add( vec3( 42.0 ) ) ).mul( 0.15 ) ).add( 0.1 ) );

		} );

		return _ret;

	} );

	const fragMain = /*@__PURE__*/ Fn( () => {

		const baseDir = select( u_displace.greaterThan( 0.0 ), vSphereDir, vPosition );
		const p = seededPos( baseDir, 100.0 ).mul( scale );

		// ── Height: texture or procedural ──

		const continent = float( 0.0 ).toVar();

		If( u_useTextureMaps.greaterThan( 0.5 ), () => {

			const uv = dirToUV( baseDir );
			continent.assign( 0.0 );

		} ).Else( () => {

			continent.assign( computeContinent( p ) );

		} );

		// Eyeball Voronoi crack valleys

		const eyeCrackMask = float( 0.0 ).toVar();

		// ice: crevasse rendering

		const eyeMajorEdge = float( 0.0 ).toVar();

		// lava: wide major-crack strength (0-1)

		const eyeMinorEdge = float( 0.0 ).toVar();

		// lava: hairline minor-crack strength (0-1)

		If( u_tidallyLocked.greaterThan( 0.5 ).and( u_eyeAridEdge.greaterThan( 1.0 ) ), () => {

			// Heavy domain-warp for organic, terrain-following shapes

			const crackWarp = vec3( noise3d( p.mul( 1.2 ).add( vec3( 11.0 ) ) ), noise3d( p.mul( 1.2 ).add( vec3( 47.0 ) ) ), noise3d( p.mul( 1.2 ).add( vec3( 83.0 ) ) ) ).mul( 0.5 );

			// Second warp layer blended with terrain height for organic merging

			const terrainWarp = vec3( noise3d( p.mul( 2.5 ).add( vec3( 23.0 ) ) ), noise3d( p.mul( 2.5 ).add( vec3( 59.0 ) ) ), noise3d( p.mul( 2.5 ).add( vec3( 91.0 ) ) ) ).mul( 0.2 ).mul( continent );
			const warpedP = p.add( crackWarp ).add( terrainWarp );

			// Single Voronoi cell set — "large" and "small" cracks are both drawn
			// on the SAME cell boundaries, so the hierarchy looks unified rather
			// than two independent layers crossing each other. Low-frequency noise
			// decides which edges get drawn wide (major cracks) vs hairline (minor).

			const v = voronoi( warpedP.mul( 0.7 ) );
			const edgeDist = v.y.sub( v.x );

			// ── Crack edge roughness ──
			// Mix multiple noise types at the crack boundary so edges are jagged/organic
			// rather than smooth Voronoi arcs. Perlin adds broad scalloping; high-freq
			// noise adds fine chipping; together they break the geometric look.

			const edgePerlin = pnoise3d( warpedP.mul( 6.0 ).add( vec3( 19.0 ) ) ).mul( 0.022 );
			const edgeChip = noise3d( warpedP.mul( 14.0 ).add( vec3( 53.0 ) ) ).mul( 0.012 ).add( noise3d( warpedP.mul( 28.0 ).add( vec3( 79.0 ) ) ).mul( 0.006 ) );
			const roughEdgeDist = edgeDist.add( edgePerlin ).add( edgeChip );
			const widthNoise = noise3d( warpedP.mul( 0.45 ).add( vec3( 13.0 ) ) );

			// Lava prefers fewer-but-wider rivers + prominent hairline detail;
			// ice prefers a more uniform major/hairline blend.

			const isLava = emissiveIntensity.greaterThan( 0.01 );
			const majorAmp = select( isLava, smoothstep( 0.55, 0.8, widthNoise ), smoothstep( 0.35, 0.7, widthNoise ) );
			const wideEdge = sub( 1.0, smoothstep( 0.0, 0.14, roughEdgeDist ) );

			// thick cracks

			const thinEdge = sub( 1.0, smoothstep( 0.0, 0.05, roughEdgeDist ) );

			// hairline cracks

			const thinAmp = select( isLava, 0.8, 0.55 );

			// Every edge exists; width ramps between hairline and wide by region

			const unifiedEdge = mix( thinEdge.mul( thinAmp ), wideEdge, majorAmp );

			// Expose separated edge strengths for lava rendering

			eyeMajorEdge.assign( wideEdge.mul( majorAmp ) );
			eyeMinorEdge.assign( thinEdge.mul( sub( 1.0, majorAmp ) ) );

			// Heavy FBM blend so cracks follow terrain contours

			const fbm = noise3d( p.mul( 2.0 ).add( vec3( 31.0 ) ) ).mul( 0.35 ).add( noise3d( p.mul( 4.0 ).add( vec3( 67.0 ) ) ).mul( 0.15 ) );
			const crackDepth = unifiedEdge.mul( 0.7 ).add( fbm.mul( 0.25 ) ).toVar();
			crackDepth.assign( crackDepth.mul( mix( crackDepth, 1.0, 0.3 ) ) );

			// softer than pure square

			const rawSunH = dot( baseDir, u_sunDirectionLocal );

			// Lava: fade the crack network toward the sub-stellar pole so the molten
			// "eye" reads as a clean pool, with fractures only emerging away from the
			// hottest centre. 0 at the pole (rawSunH→1) → 1 by mid day-side.

			If( emissiveIntensity.greaterThan( 0.01 ), () => {

				const poleFade = smoothstep( 0.92, 0.45, rawSunH );
				eyeMajorEdge.mulAssign( poleFade );
				eyeMinorEdge.mulAssign( poleFade );
				crackDepth.mulAssign( poleFade );

			} );

			If( emissiveIntensity.greaterThan( 0.01 ), () => {

				// Lava: cracks deeper near sub-stellar (hotter, more molten)

				const heatCarve = smoothstep( - 0.5, 0.5, rawSunH );
				continent.subAssign( crackDepth.mul( heatCarve ).mul( u_lavaCrackDepth ) );

				// Cold-side crack mask for anti-stellar: same Voronoi geometry,
				// anti-stellar weighted. Lets adjustedIceCap carve fracture seams
				// into the solidified crust cap (like ice has dark-water seams).

				const coldCarve = sub( 1.0, smoothstep( - 0.5, 0.0, rawSunH ) );
				eyeCrackMask.assign( crackDepth.mul( coldCarve ) );

			} ).Else( () => {

				// Ice: cracks live in a band between the two poles.
				// Sub-stellar (rawSunH=1): clear open ocean.
				// Day side → terminator → mid-night: full cellular crack pattern.
				// Anti-stellar (rawSunH=-1): solid unbroken polar ice cap.

				const iceCarve = sub( 1.0, smoothstep( 0.2, 0.95, rawSunH ) ).mul( smoothstep( - 0.55, - 0.1, rawSunH ) );
				const iceCrack = crackDepth.mul( iceCarve );
				continent.subAssign( iceCrack.mul( 0.45 ) );
				eyeCrackMask.assign( iceCrack );

				// Sub-stellar abyssal basin — force the continent lower near the eye
				// so the ocean-depth gradient naturally reaches its deepest colour
				// at the sub-stellar pole. Wide and concentrated: the darkest zone
				// covers most of the inner day-side, fading to normal terrain as
				// the floes take over.

				const subStellarBasin = smoothstep( 0.1, 0.85, rawSunH );
				continent.subAssign( subStellarBasin.mul( 0.6 ) );

			} );

			continent.assign( max( continent, 0.0 ) );

		} );

		const seaLevel = u_seaLevel.toVar();

		// Eyeball: pre-compute sun angle for sea level adjustment (with same noise perturbation)

		const effectiveSeaLevel = seaLevel.toVar();

		If( u_tidallyLocked.greaterThan( 0.5 ), () => {

			// Match the terrain-based perturbation from the biome section

			const eyeAnglePre = dot( baseDir, u_sunDirectionLocal ).add( continent.sub( 0.5 ).mul( 0.25 ) ).add( pnoise3d( p.mul( 2.0 ).add( vec3( 17.0 ) ) ).sub( 0.5 ).mul( 0.08 ) );

			If( u_eyeAridEdge.greaterThan( 1.0 ), () => {

				// Eyeball sea level gradient: ocean/lava at sub-stellar, land/ice at anti-stellar

				const rawSun = dot( baseDir, u_sunDirectionLocal );
				const dayBoost = select( emissiveIntensity.greaterThan( 0.01 ), smoothstep( u_lavaPoolSize, u_lavaPoolSize.add( 0.6 ), rawSun ), smoothstep( 0.0, 0.65, rawSun ) );

				// ice: wider ocean

				const maxSea = select( emissiveIntensity.greaterThan( 0.01 ), 0.9, 1.0 );
				effectiveSeaLevel.assign( mix( 0.05, maxSea, dayBoost ) );

			} ).Else( () => {

				// Temperate eyeball: arid sub-stellar drops sea level

				const subStellarDry = smoothstep( u_eyeAridEdge.sub( 0.15 ), u_eyeAridEdge.add( 0.2 ), eyeAnglePre );
				effectiveSeaLevel.assign( mix( seaLevel, 0.0, subStellarDry ) );

			} );

		} );

		const isLand = smoothstep( effectiveSeaLevel.sub( 0.008 ), effectiveSeaLevel.add( 0.008 ), continent );

		// ── Normal mapping: texture or procedural ──

		const bumpNormal = vNormal.toVar();

		If( u_lod.greaterThan( 0.5 ), () => {

			If( u_useTextureMaps.greaterThan( 0.5 ), () => {

				// Pre-baked normal map — scale XY by bumpStrength at runtime

				const uv = dirToUV( baseDir );
				const texN = vec3( 0.5, 0.5, 1.0 ).mul( 2.0 ).sub( 1.0 ).toVar();
				const str = select( u_displace.greaterThan( 0.0 ), u_bumpStrength.mul( 0.5 ), u_bumpStrength );
				texN.xy.mulAssign( str );
				texN.assign( normalize( texN ) );

				// Tangent frame from sphere direction

				const up = select( abs( baseDir.y ).lessThan( 0.999 ), vec3( 0.0, 1.0, 0.0 ), vec3( 1.0, 0.0, 0.0 ) );
				const T = normalize( cross( up, baseDir ) );
				const B = cross( baseDir, T );
				bumpNormal.assign( normalize( T.mul( texN.x ).add( B.mul( texN.y ) ).add( baseDir.mul( texN.z ) ) ) );
				bumpNormal.assign( mix( vNormal, bumpNormal, isLand.mul( 0.95 ).add( 0.05 ) ) );

			} ).Else( () => {

				// Layer 1: terrain-scale bump from computeContinent

				const eps = float( 0.002 );
				const hx = computeContinent( p.add( vec3( eps, 0.0, 0.0 ) ) );
				const hy = computeContinent( p.add( vec3( 0.0, eps, 0.0 ) ) );
				const hz = computeContinent( p.add( vec3( 0.0, 0.0, eps ) ) );
				const grad = vec3( continent.sub( hx ), continent.sub( hy ), continent.sub( hz ) ).div( eps );
				const strength = select( u_displace.greaterThan( 0.0 ), u_bumpStrength.mul( 0.5 ), u_bumpStrength );
				bumpNormal.assign( normalize( vNormal.add( grad.mul( strength ) ) ) );

				// Layer 2: ridged mountain detail

				const re = float( 0.002 );
				const rc = ridgedNoise( p, 2.5 );
				const rx = ridgedNoise( p.add( vec3( re, 0.0, 0.0 ) ), 2.5 );
				const ry = ridgedNoise( p.add( vec3( 0.0, re, 0.0 ) ), 2.5 );
				const rz = ridgedNoise( p.add( vec3( 0.0, 0.0, re ) ), 2.5 );
				const ridgeGrad = vec3( rc.sub( rx ), rc.sub( ry ), rc.sub( rz ) ).div( re );
				bumpNormal.assign( normalize( bumpNormal.add( ridgeGrad.mul( 0.08 ).mul( isLand ) ) ) );

				// Layer 3: medium-frequency hills and plateaus

				const me2 = float( 0.003 );
				const mc2 = cloudNoise( p, 3.0 );
				const mx2 = cloudNoise( p.add( vec3( me2, 0.0, 0.0 ) ), 3.0 );
				const my2 = cloudNoise( p.add( vec3( 0.0, me2, 0.0 ) ), 3.0 );
				const mz2 = cloudNoise( p.add( vec3( 0.0, 0.0, me2 ) ), 3.0 );
				const hillGrad = vec3( mc2.sub( mx2 ), mc2.sub( my2 ), mc2.sub( mz2 ) ).div( me2 );
				bumpNormal.assign( normalize( bumpNormal.add( hillGrad.mul( 0.04 ).mul( isLand ) ) ) );

				// Layer 4: fine surface roughness

				const me = float( 0.005 );
				const mc = pnoise3d( p.mul( 8.0 ) );
				const mx = pnoise3d( p.add( vec3( me, 0.0, 0.0 ) ).mul( 8.0 ) );
				const my = pnoise3d( p.add( vec3( 0.0, me, 0.0 ) ).mul( 8.0 ) );
				const mz = pnoise3d( p.add( vec3( 0.0, 0.0, me ) ).mul( 8.0 ) );
				const microGrad = vec3( mc.sub( mx ), mc.sub( my ), mc.sub( mz ) ).div( me );
				bumpNormal.assign( normalize( bumpNormal.add( microGrad.mul( 0.03 ).mul( isLand ) ) ) );
				bumpNormal.assign( mix( vNormal, bumpNormal, isLand.mul( 0.95 ).add( 0.05 ) ) );

			} );

		} );

		// ── Biome coloring — aridity-aware + eyeball planet support ──

		const aridity = sub( 1.0, smoothstep( 0.15, 0.55, seaLevel ) ).toVar();

		// Eyeball planet: per-zone biome control

		const eyeballSunAngle = float( 0.0 ).toVar();
		const eyeSeaLevel = seaLevel.toVar();

		If( u_tidallyLocked.greaterThan( 0.5 ), () => {

			const rawSunAngle = dot( baseDir, u_sunDirectionLocal );

			// 1=sub-stellar, 0=terminator, -1=anti-stellar
			// Perturb band edges using the actual terrain height — bands follow landmasses
			// Higher terrain = slightly warmer (pushes toward arid), lower = cooler (toward ice)

			const terrainPerturb = continent.sub( 0.5 ).mul( 0.25 );

			// Add small noise for extra raggedness at coastlines

			const edgeNoise = pnoise3d( p.mul( 2.0 ).add( vec3( 17.0 ) ) ).sub( 0.5 ).mul( 0.08 );
			eyeballSunAngle.assign( rawSunAngle.add( terrainPerturb ).add( edgeNoise ) );

			// Sub-stellar (hot): fully arid, no water

			const subStellar = smoothstep( u_eyeAridEdge.sub( 0.15 ), u_eyeAridEdge.add( 0.2 ), eyeballSunAngle );
			aridity.assign( mix( aridity, 1.0, subStellar ) );
			eyeSeaLevel.assign( mix( seaLevel, 0.0, subStellar ) );

			// Terminator ring: force fully wet/green — habitable belt

			const terminator = sub( 1.0, smoothstep( u_eyeAridEdge.sub( 0.15 ), u_eyeAridEdge.add( 0.2 ), eyeballSunAngle ) ).mul( sub( 1.0, smoothstep( u_eyeIceEdge.add( 0.1 ), u_eyeIceEdge.sub( 0.2 ), eyeballSunAngle ) ) );
			aridity.assign( mix( aridity, 0.0, terminator ) );

			// fully wet at terminator — green vegetation
			// Anti-stellar (cold): water with icebergs → solid ice

			const antiStellar = smoothstep( u_eyeIceEdge.add( 0.1 ), u_eyeIceEdge.sub( 0.25 ), eyeballSunAngle );
			aridity.assign( mix( aridity, 0.2, antiStellar ) );

		} );

		const moisture = select( u_lod.greaterThan( 0.5 ), cloudNoise( p.mul( 0.5 ).add( vec3( 33.0 ) ), 1.0 ), noise3d( p.mul( 0.5 ).add( vec3( 33.0 ) ) ) ).toVar();

		// Eyeball: boost moisture at terminator to ensure green biome

		If( u_tidallyLocked.greaterThan( 0.5 ), () => {

			const termMoisture = sub( 1.0, smoothstep( u_eyeAridEdge.sub( 0.15 ), u_eyeAridEdge.add( 0.2 ), eyeballSunAngle ) ).mul( sub( 1.0, smoothstep( u_eyeIceEdge.add( 0.1 ), u_eyeIceEdge.sub( 0.2 ), eyeballSunAngle ) ) );
			moisture.assign( mix( moisture, u_eyeMoisture.add( moisture.mul( 0.3 ) ), termMoisture ) );

		} );

		const mountainRidge = select( u_lod.greaterThan( 0.5 ), ridgedNoise( p, 2.0 ), 0.0 );
		const microNoise = noise3d( p.mul( 4.0 ) );
		const warpNoise = noise3d( p.mul( 3.0 ).add( vec3( 77.0 ) ) );

		// Ocean / basins: on arid planets, "ocean" is dark dusty lowland, not water.
		// Eyeball (tidally-locked) worlds keep the very dark deep water (color1 * 0.12)
		// so it matches the crevasse crack colour and unifies with the ice cracks.
		// Open-ocean worlds (WATER_WORLD / TEMPERATE) lift the deep-water floor so the
		// sea reads as water rather than crushing to near-black under the cloud layer.

		const deepWater = color1.mul( select( u_tidallyLocked.greaterThan( 0.5 ), 0.12, 0.4 ) );
		const midWater = color1.mul( 0.6 );
		const shallowWater = color1.mul( 0.95 ).add( vec3( 0.01, 0.02, 0.015 ) );

		// Arid basins: dark rusty lowlands instead of blue water

		const deepBasin = color3.mul( 0.25 ).add( vec3( 0.01, 0.005, 0.0 ) );
		const midBasin = color3.mul( 0.45 ).add( vec3( 0.02, 0.01, 0.0 ) );
		const shallowBasin = color3.mul( 0.6 );

		// Blend between water and arid basin based on aridity

		const deepOcean = mix( deepWater, deepBasin, aridity );
		const midOcean = mix( midWater, midBasin, aridity );
		const shallowOcean = mix( shallowWater, shallowBasin, aridity );
		const oceanDepth = smoothstep( 0.0, effectiveSeaLevel, continent );
		const oceanColor = mix( deepOcean, midOcean, smoothstep( 0.0, 0.5, oceanDepth ) ).toVar();
		oceanColor.assign( mix( oceanColor, shallowOcean, smoothstep( 0.92, 0.99, oceanDepth ) ) );
		oceanColor.addAssign( vec3( - 0.006, 0.006, 0.01 ).mul( microNoise ).mul( sub( 1.0, aridity ) ) );

		// Coastal shelf

		const coastalBand = smoothstep( effectiveSeaLevel.sub( 0.015 ), effectiveSeaLevel.sub( 0.003 ), continent ).mul( sub( 1.0, isLand ) );
		const coastalColor = mix( color2, color3, 0.5 ).mul( 0.75 ).add( vec3( 0.04, 0.04, 0.01 ) );
		oceanColor.assign( mix( oceanColor, coastalColor, coastalBand.mul( 0.4 ).mul( sub( 1.0, aridity.mul( 0.7 ) ) ) ) );

		// Land zones

		const landHeight = continent.sub( effectiveSeaLevel ).div( sub( 1.0, effectiveSeaLevel ).add( 0.001 ) );
		const latitude = float( 0.0 ).toVar();

		If( u_tidallyLocked.greaterThan( 0.5 ), () => {

			// Eyeball: "latitude" = distance from sub-stellar point
			// 0 at sub-stellar (warm), 1 at anti-stellar (cold)

			latitude.assign( sub( 1.0, eyeballSunAngle.mul( 0.5 ).add( 0.5 ) ) );

		} ).Else( () => {

			latitude.assign( abs( baseDir.y ) );

		} );

		// Shore — on arid planets, no beach, just terrain edge

		const wetShore = mix( color2, color3, 0.3 ).add( vec3( 0.08, 0.06, 0.02 ) );
		const dryShore = color3.mul( 0.7 ).add( vec3( 0.03, 0.015, 0.0 ) );
		const shoreColor = mix( wetShore, dryShore, aridity );

		// Lowland — on arid planets, force toward arid tones
		// Eyeball: apply hue/saturation shift to vegetation color

		const vegColor = color2.toVar();

		If( u_tidallyLocked.greaterThan( 0.5 ), () => {

			// Hue rotation via Rodrigues' formula around luminance axis

			const k = vec3( 0.57735 );

			// normalize(1,1,1)

			const angle = u_eyeVegHue.mul( 6.2832 );
			const ca = cos( angle );
			const sa = sin( angle );
			vegColor.assign( vegColor.mul( ca ).add( cross( k, vegColor ).mul( sa ) ).add( k.mul( dot( k, vegColor ) ).mul( sub( 1.0, ca ) ) ) );

			// Saturation: lerp toward grey

			const lum = dot( vegColor, vec3( 0.299, 0.587, 0.114 ) );
			vegColor.assign( mix( vec3( lum ), vegColor, u_eyeVegSat ) );

		} );

		const lowWet = vegColor.mul( 1.1 ).add( vec3( - 0.005, 0.015, - 0.005 ) ).toVar();

		If( u_tidallyLocked.greaterThan( 0.5 ), () => {

			const termZone = sub( 1.0, smoothstep( u_eyeAridEdge.sub( 0.15 ), u_eyeAridEdge.add( 0.2 ), eyeballSunAngle ) ).mul( sub( 1.0, smoothstep( u_eyeIceEdge.add( 0.1 ), u_eyeIceEdge.sub( 0.2 ), eyeballSunAngle ) ) );
			lowWet.assign( mix( lowWet, vegColor.mul( 1.8 ).add( vec3( 0.0, 0.02, 0.0 ) ), termZone.mul( 0.6 ) ) );

		} );

		const lowDry = mix( color2, color3, 0.4 );
		const lowArid = color3.mul( 0.9 ).add( vec3( 0.04, 0.02, - 0.01 ) );
		const latMoisture = moisture.add( smoothstep( 0.0, 0.25, latitude ).mul( 0.15 ) ).sub( smoothstep( 0.5, 0.8, latitude ).mul( 0.1 ) ).toVar();

		// Aridity pushes moisture down — arid planets have drier lowlands everywhere

		latMoisture.assign( latMoisture.mul( sub( 1.0, aridity.mul( 0.6 ) ) ) );
		const lowland = mix( lowArid, lowDry, smoothstep( 0.25, 0.4, latMoisture ) ).toVar();
		lowland.assign( mix( lowland, lowWet, smoothstep( 0.4, 0.6, latMoisture ) ) );
		lowland.addAssign( vec3( 0.015, - 0.008, - 0.015 ).mul( warpNoise ) );

		// Highland — on arid planets, skip tundra, stay rocky

		const highland = color3.mul( 0.9 ).toVar();
		highland.addAssign( vec3( 0.02, 0.008, - 0.015 ).mul( mountainRidge ) );
		const tundra = mix( color3.mul( 0.75 ), color4.mul( 0.6 ), 0.4 ).add( vec3( - 0.02, - 0.01, 0.02 ) );
		const tundraBlend = smoothstep( 0.5, 0.8, latitude ).mul( smoothstep( 0.3, 0.6, landHeight ) ).mul( sub( 1.0, aridity ) );
		highland.assign( mix( highland, tundra, tundraBlend ) );

		// Exposed rock

		const exposedRock = color3.mul( 0.65 ).add( color4.mul( 0.35 ) ).toVar();

		// On arid planets, rock is more rusty

		exposedRock.assign( mix( exposedRock, color3.mul( 0.55 ).add( vec3( 0.04, 0.02, 0.0 ) ), aridity ) );

		// Peaks — dusty rock on arid, snow on wet

		const baseSnowLine = mix( 0.92, 0.7, smoothstep( 0.4, 0.8, latitude ) );
		const snowLine = mix( baseSnowLine, 1.5, aridity );

		// far above max on Mars = no snow

		const dustyPeak = color3.mul( 0.65 ).add( vec3( 0.05, 0.025, 0.005 ) );
		const peaks = mix( color4, dustyPeak, aridity );

		// Blend terrain zones

		const landColor = mix( shoreColor, lowland, smoothstep( 0.02, 0.12, landHeight ) ).toVar();
		const brownBlend = smoothstep( 0.1, 0.55, landHeight ).mul( add( 0.6, mul( 0.4, sub( 1.0, latMoisture ) ) ) );
		landColor.assign( mix( landColor, highland, brownBlend ) );
		landColor.assign( mix( landColor, exposedRock, mountainRidge.mul( smoothstep( 0.2, 0.5, landHeight ) ).mul( 0.6 ) ) );
		landColor.assign( mix( landColor, peaks, smoothstep( snowLine, snowLine.add( 0.06 ), landHeight ) ) );

		// Surface texture variation

		landColor.mulAssign( add( 0.96, mul( 0.06, microNoise ) ) );
		const surfaceColor = mix( oceanColor, landColor, isLand ).toVar();

		// ── Ice system ──
		// Domain-warped noise for organic ice boundaries

		const nWarp = vec3( noise3d( p.mul( 2.0 ).add( vec3( 11.0, 0.0, 0.0 ) ) ), noise3d( p.mul( 2.0 ).add( vec3( 0.0, 23.0, 0.0 ) ) ), noise3d( p.mul( 2.0 ).add( vec3( 0.0, 0.0, 37.0 ) ) ) ).mul( u_iceWarp );
		const nWarp2 = vec3( noise3d( p.add( nWarp ).mul( 4.0 ).add( vec3( 41.0 ) ) ), noise3d( p.add( nWarp ).mul( 4.0 ).add( vec3( 59.0 ) ) ), noise3d( p.add( nWarp ).mul( 4.0 ).add( vec3( 71.0 ) ) ) ).mul( u_iceWarp.mul( 0.375 ) );
		const warpedIceP = p.add( nWarp ).add( nWarp2 );
		const iceNoise = noise3d( warpedIceP.mul( u_iceDetail ).add( vec3( 11.0 ) ) ).mul( 0.12 ).add( noise3d( warpedIceP.mul( u_iceDetail.mul( 2.8 ) ).add( vec3( 23.0 ) ) ).mul( 0.04 ) );
		const iceColor = vec3( 0.82, 0.85, 0.9 ).add( vec3( 0.04, 0.03, 0.02 ).mul( microNoise ) ).toVar();

		// Lava eyeball: replace ice with dark solidified crust

		If( emissiveIntensity.greaterThan( 0.01 ), () => {

			iceColor.assign( color4.add( vec3( 0.03, 0.01, 0.005 ).mul( microNoise ) ) );

		} );

		const iceCap = float( 0.0 ).toVar(), iceFringe = float( 0.0 ).toVar();

		If( u_tidallyLocked.greaterThan( 0.5 ), () => {

			// Eyeball: ice centered on anti-stellar point (night side)

			const antiStellar = dot( baseDir, u_sunDirectionLocal ).negate();

			// 1=anti-stellar, -1=sub-stellar
			// Icebergs/sea ice: wide graduation from open water → scattered floes → pack ice → solid

			const icebergNoise = noise3d( warpedIceP.mul( add( 3.0, u_eyeIceBergDensity.mul( 4.0 ) ) ).add( vec3( 37.0 ) ) ).mul( 0.6 ).add( noise3d( warpedIceP.mul( add( 6.0, u_eyeIceBergDensity.mul( 6.0 ) ) ).add( vec3( 83.0 ) ) ).mul( 0.3 ) );

			// Cracked floe texture: large angular shapes for pack ice look

			const floeNoise = noise3d( warpedIceP.mul( 1.5 ).add( vec3( 59.0 ) ) ).mul( 0.4 ).add( noise3d( warpedIceP.mul( 3.0 ).add( vec3( 97.0 ) ) ).mul( 0.3 ) );

			// Solid ice: deep into night side. Feed the SAME floe noise that paints
			// the pack-ice floes into the cap's edge so the boundary follows floe
			// shapes — solid ice reads as frozen-together floes rather than a disc
			// dropped on top. Perturbation scaled by u_iceOceanEdgeNoise (0=smooth,
			// 1=strongly ragged); cap size shifted by u_iceOceanPolarFade.

			const solidIceStart = u_eyeIceEdge.negate().add( 0.15 ).sub( u_iceOceanPolarFade.sub( 0.5 ).mul( 0.5 ) );
			const edgeAmt = u_iceOceanEdgeNoise.mul( 2.0 );
			const capEdgePerturb = iceNoise.mul( 0.6 ).mul( edgeAmt ).add( floeNoise.sub( 0.35 ).mul( 0.85 ).mul( edgeAmt ) );
			iceCap.assign( smoothstep( solidIceStart.sub( 0.2 ), solidIceStart.add( 0.3 ), antiStellar.add( capEdgePerturb ) ) );

			// Iceberg zone: starts near terminator, extends deep toward anti-stellar

			const icebergZoneStart = min( - 0.1, solidIceStart.mul( 0.3 ) );

			// starts earlier

			const icebergZone = smoothstep( icebergZoneStart.sub( 0.15 ), icebergZoneStart.add( 0.1 ), antiStellar );

			// Threshold decreases with distance — sparse near terminator, dense near solid ice

			const densityGradient = smoothstep( icebergZoneStart, solidIceStart, antiStellar );
			const icebergThreshold = mix( 0.7, 0.15, densityGradient ).sub( u_eyeIceBergDensity.mul( 0.15 ) );
			const icebergs = smoothstep( icebergThreshold, icebergThreshold.add( 0.1 ), icebergNoise ).mul( icebergZone ).toVar();

			// Pack ice: larger connected floes closer to solid ice

			const packIceZone = smoothstep( solidIceStart.sub( 0.3 ), solidIceStart, antiStellar );
			const packIce = smoothstep( 0.3, 0.5, floeNoise ).mul( packIceZone );
			icebergs.assign( max( icebergs, packIce ) );

			// Icebergs only in water, not on land

			icebergs.mulAssign( sub( 1.0, isLand ).mul( sub( 1.0, iceCap ) ) );
			iceFringe.assign( max( smoothstep( solidIceStart.sub( 0.15 ), solidIceStart, antiStellar.add( iceNoise ) ).mul( sub( 1.0, iceCap ) ).mul( 0.4 ), icebergs.mul( 0.75 ) ) );

		} ).Else( () => {

			// Normal: polar ice caps

			const northLat = baseDir.y;
			const southLat = baseDir.y.negate();
			const northNoise = iceNoise.toVar();
			const southNoise = noise3d( warpedIceP.mul( u_iceDetail ).add( vec3( 53.0 ) ) ).mul( 0.14 ).add( noise3d( warpedIceP.mul( u_iceDetail.mul( 2.8 ) ).add( vec3( 67.0 ) ) ).mul( 0.04 ) );
			const northStart = u_iceCapSize.add( u_seed.x.mul( 0.06 ) );
			const southStart = u_iceCapSize.sub( 0.02 ).add( u_seed.y.mul( 0.08 ) );
			const northCap = smoothstep( northStart, northStart.add( u_iceEdge ), northLat.add( northNoise ) );
			const southCap = smoothstep( southStart, southStart.add( u_iceEdge ), southLat.add( southNoise ) );
			iceCap.assign( max( northCap, southCap ) );
			const northFringe = smoothstep( northStart.sub( 0.03 ), northStart, northLat.add( northNoise ) ).mul( sub( 1.0, northCap ) );
			const southFringe = smoothstep( southStart.sub( 0.03 ), southStart, southLat.add( southNoise ) ).mul( sub( 1.0, southCap ) );
			iceFringe.assign( max( northFringe, southFringe ).mul( 0.25 ) );

		} );

		surfaceColor.assign( mix( surfaceColor, mix( surfaceColor, iceColor, 0.4 ), iceFringe ) );

		// Ice crevasses: reduce ice cap coverage where Voronoi cracks are deep

		const adjustedIceCap = iceCap.mul( sub( 1.0, eyeCrackMask.mul( 3.5 ) ) ).toVar();
		adjustedIceCap.assign( max( adjustedIceCap, 0.0 ) );
		surfaceColor.assign( mix( surfaceColor, iceColor, adjustedIceCap ) );

		// Dark water visible in crevasses through the ice

		If( eyeCrackMask.greaterThan( 0.02 ).and( emissiveIntensity.lessThan( 0.01 ) ), () => {

			// Crack interiors = very deep dark water. Must be darker than the
			// surrounding ocean (which is already color1 * 0.3) so crack lines read
			// as dark seams between brighter floes, not bright lines on dark cells.

			const crevassColor = color1.mul( 0.12 );
			const crevassVis = smoothstep( 0.02, 0.15, eyeCrackMask );
			surfaceColor.assign( mix( surfaceColor, crevassColor, crevassVis.mul( 0.85 ).mul( u_iceOceanCrackDepth.mul( 2.0 ) ) ) );

		} );

		// Cloud shadows: handled by the cloud sphere layer rendering on top
		// with alpha blending — no separate shadow pass needed.
		// Lighting with bump normal (land only; ocean is smooth)

		const effectiveNormal = mix( vNormal, bumpNormal, isLand );
		const V = normalize( cameraPosition.sub( vWorldPosition ) );
		surfaceColor.assign( planetLighting( surfaceColor, vWorldNormal, u_sunDirection, V, u_ambient ) );

		// Specular on ocean — only on lit side

		const viewDir = normalize( vPosition.negate() );
		const reflectDir = reflect( u_sunDirection.negate(), vWorldNormal );
		const spec = pow( max( dot( viewDir, reflectDir ), 0.0 ), 32.0 );
		const specShadow = wrapDiffuse( vWorldNormal, u_sunDirection );
		surfaceColor.addAssign( vec3( 0.3 ).mul( spec ).mul( specShadow ).mul( sub( 1.0, isLand ) ) );

		// ── Lava eyeball: emissive glow (cracks are already in terrain) ──

		If( emissiveIntensity.greaterThan( 0.01 ).and( u_tidallyLocked.greaterThan( 0.5 ) ), () => {

			const rawSun = dot( baseDir, u_sunDirectionLocal );
			const heatGradient = smoothstep( - 0.4, u_lavaHeatGrad, rawSun );

			// Lava pool: REPLACE surface color in molten areas with graduated lava

			const poolMask = sub( 1.0, isLand );

			// Internal pool variation: terrain noise + depth create cooler/hotter patches

			const poolNoise = noise3d( p.mul( 2.0 ).add( vec3( 19.0 ) ) ).mul( 0.25 ).add( noise3d( p.mul( 5.0 ).add( vec3( 43.0 ) ) ).mul( 0.12 ) );
			const poolDepth = smoothstep( effectiveSeaLevel, effectiveSeaLevel.sub( 0.2 ), continent );

			// Heat within pool. The macro term is a RADIAL falloff from the
			// sub-stellar point (rawSun=1), squared so the hot zone concentrates into
			// a distinct hot pole and fades outward — NOT heatGradient, which
			// saturates across the whole day side and made the pool uniformly patchy
			// with no hotter middle. Depth + noise modulate it as a secondary effect.

			const poleHeat = smoothstep( - 0.15, 1.0, rawSun ).toVar();
			poleHeat.mulAssign( poleHeat );
			const poolHeat = poleHeat.mul( add( 0.65, poolDepth.mul( 0.35 ) ) ).mul( add( 0.82, poolNoise ) ).toVar();
			poolHeat.assign( clamp( poolHeat, 0.0, 1.0 ) );

			// Gentle bias to keep the fading periphery red-dominant. Mild because the
			// squared radial term already concentrates the hot core.

			poolHeat.assign( pow( poolHeat, 1.15 ) );

			// Graduated lava color: near-black cooling crust → deep red (dominant,
			// cooler pool) → red-orange → orange → bright orange → a small yellow-hot
			// core confined to the sub-stellar peak. Reads as a temperature map with
			// a yellow centre grading out through orange to red.

			const poolColor = vec3( 0.05, 0.004, 0.001 ).toVar();

			// near-black cooling crust

			poolColor.assign( mix( poolColor, vec3( 0.40, 0.02, 0.002 ), smoothstep( 0.05, 0.22, poolHeat ) ) );

			// very dark red

			poolColor.assign( mix( poolColor, vec3( 0.85, 0.06, 0.004 ), smoothstep( 0.22, 0.48, poolHeat ) ) );

			// deep red (dominant band)

			poolColor.assign( mix( poolColor, vec3( 0.97, 0.15, 0.009 ), smoothstep( 0.48, 0.68, poolHeat ) ) );

			// red-orange

			poolColor.assign( mix( poolColor, vec3( 1.08, 0.26, 0.018 ), smoothstep( 0.68, 0.84, poolHeat ) ) );

			// orange

			poolColor.assign( mix( poolColor, vec3( 1.20, 0.40, 0.035 ), smoothstep( 0.84, 0.93, poolHeat ) ) );

			// bright orange

			poolColor.assign( mix( poolColor, vec3( 1.45, 0.70, 0.13 ), smoothstep( 0.93, 1.0, poolHeat ) ) );

			// yellow-hot core (small peak)
			// Replace surface color in pool areas (not additive)

			surfaceColor.assign( mix( surfaceColor, poolColor, poolMask ) );

			// Orange cooling-crust patches on sub-stellar pool: solidifying surface skin
			// floats as darker islands on the bright lava, adding texture to the hot side

			const coolPatch = noise3d( p.mul( 2.8 ).add( vec3( 71.0 ) ) ).mul( 0.52 ).add( noise3d( p.mul( 6.5 ).add( vec3( 43.0 ) ) ).mul( 0.28 ) );
			const coolMask = smoothstep( 0.5, 0.72, coolPatch ).mul( poolMask ).mul( smoothstep( 0.25, 0.75, rawSun ) );
			surfaceColor.assign( mix( surfaceColor, vec3( 0.6, 0.12, 0.012 ), coolMask.mul( 0.6 ) ) );

			// ── Black basalt crust with surface detail + normal-mapped lighting ──
			// Multi-scale noise: coarse macro variation, ridged mid-scale for rocky
			// texture, fine Perlin grain. A fake normal map from noise gradients then
			// lights the surface so the texture has actual shadow relief.

			const basaltBase = vec3( 0.02, 0.014, 0.011 );
			const bMacro = noise3d( p.mul( 4.5 ).add( vec3( 23.0 ) ) ).mul( 0.5 ).add( noise3d( p.mul( 9.0 ).add( vec3( 61.0 ) ) ).mul( 0.3 ) );
			const bRidge = ridgedNoise( p.mul( 7.0 ), 2.5 ).mul( 0.35 );

			// rocky relief

			const bFine = pnoise3d( p.mul( 22.0 ).add( vec3( 47.0 ) ) ).mul( 0.2 ).add( noise3d( p.mul( 40.0 ).add( vec3( 83.0 ) ) ).mul( 0.1 ) );

			// micro grain
			// Fake normal map: finite-difference gradient of mid-scale noise

			const bne = float( 0.004 );
			const bnc = noise3d( p.mul( 12.0 ).add( vec3( 37.0 ) ) );
			const bGrad = vec3( bnc.sub( noise3d( p.add( vec3( bne, 0, 0 ) ).mul( 12.0 ).add( vec3( 37.0 ) ) ) ), bnc.sub( noise3d( p.add( vec3( 0, bne, 0 ) ).mul( 12.0 ).add( vec3( 37.0 ) ) ) ), bnc.sub( noise3d( p.add( vec3( 0, 0, bne ) ).mul( 12.0 ).add( vec3( 37.0 ) ) ) ) ).div( bne );
			const basaltNormal = normalize( vNormal.add( bGrad.mul( 0.18 ) ) );
			const basaltLight = wrapDiffuse( basaltNormal, u_sunDirection );

			// Compose: base colour tinted by noise layers, then lit

			const bDetail = bMacro.sub( 0.35 ).mul( 0.022 ).add( bRidge.sub( 0.3 ).mul( 0.018 ) ).add( bFine.sub( 0.3 ).mul( 0.008 ) );
			const basaltColor = basaltBase.add( vec3( 1.2, 0.8, 0.6 ).mul( bDetail ).mul( 0.018 ) ).toVar();
			basaltColor.mulAssign( add( 0.12, basaltLight.mul( 0.88 ) ) );

			// shadow relief from fake normals
			// Keep pool areas as-is; replace crust with textured lit basalt.

			surfaceColor.assign( mix( basaltColor, surfaceColor, poolMask ) );

			// ── Lava rivers along MAJOR Voronoi edges ──
			// Directly drive glow from eyeMajorEdge so the unified hierarchy is
			// visible regardless of whether terrain carved below sea level.

			const riverCore = vec3( 0.04, 0.007, 0.002 ).toVar();
			riverCore.assign( mix( riverCore, vec3( 0.38, 0.045, 0.007 ), smoothstep( - 0.5, - 0.05, rawSun ) ) );

			// dark red

			riverCore.assign( mix( riverCore, vec3( 0.90, 0.18, 0.014 ), smoothstep( - 0.05, 0.2, rawSun ) ) );

			// red-orange

			riverCore.assign( mix( riverCore, vec3( 1.05, 0.30, 0.028 ), smoothstep( 0.2, 0.55, rawSun ) ) );

			// bright red-orange (less green)
			// Rivers: glow on crack lines only — NOT the whole pool (which already has
			// poolColor). deepLava widens the crack where terrain dips below sea level.

			const deepLava = smoothstep( effectiveSeaLevel.add( 0.05 ), effectiveSeaLevel.sub( 0.08 ), continent );

			// Per-channel flow variation: low-freq noise makes some channels run hot
			// (bright, active flow) and others dim (crusting over), so the major
			// network reads as natural rivers instead of a uniform glowing net.

			const riverFlow = add( 0.45, mul( 0.55, noise3d( p.mul( 0.85 ).add( vec3( 101.0 ) ) ) ) );
			const riverMask = eyeMajorEdge.mul( mix( 0.6, 1.0, deepLava ) ).mul( riverFlow );
			surfaceColor.addAssign( riverCore.mul( riverMask ).mul( heatGradient ).mul( emissiveIntensity ).mul( 2.2 ) );

			// ── Hairline red glow along MINOR Voronoi edges ──
			// Keeps minor cell boundaries visible on the basalt crust as thin
			// red/orange fracture lines, without widening into rivers.

			const hairlineGlow = vec3( 0.02, 0.004, 0.002 ).toVar();
			hairlineGlow.assign( mix( hairlineGlow, vec3( 0.22, 0.04, 0.01 ), smoothstep( - 0.3, 0.1, rawSun ) ) );
			hairlineGlow.assign( mix( hairlineGlow, vec3( 0.55, 0.12, 0.02 ), smoothstep( 0.1, 0.5, rawSun ) ) );
			surfaceColor.addAssign( hairlineGlow.mul( eyeMinorEdge ).mul( heatGradient ).mul( emissiveIntensity ).mul( 0.85 ) );

			// Subtle warm tint on crust near sub-stellar (radiant heat from below) — kept very faint

			const surfaceHeat = isLand.mul( heatGradient ).mul( heatGradient );
			surfaceColor.addAssign( vec3( 0.04, 0.005, 0.001 ).mul( surfaceHeat ).mul( 0.3 ) );

			// Darken anti-stellar: cold dead basalt

			const coldDarken = smoothstep( 0.1, - 0.5, rawSun ).mul( isLand );
			surfaceColor.mulAssign( mix( 1.0, 0.05, coldDarken ) );

			// ── Cold-side fracture texture (applied AFTER coldDarken so it survives) ──
			// Voronoi cell hierarchy is visible at anti-stellar as dim residual-heat
			// seams — major cracks glow faintly dark-red (magma depth), minor cracks
			// are slightly brighter surface variation. Both fade to zero at sub-stellar
			// where the hot-side rivers take over.

			const coldZone = sub( 1.0, heatGradient ).mul( isLand );

			// Major cracks: faint ember glow from magma far below

			surfaceColor.addAssign( vec3( 0.06, 0.012, 0.004 ).mul( eyeMajorEdge ).mul( coldZone ).mul( emissiveIntensity ) );

			// Hairline cracks: the fine minor network also survives on the crust as
			// thin cooled dark-red seams, completing the unified major/minor
			// hierarchy across the whole anti-stellar side (not just the hot pool).

			surfaceColor.addAssign( vec3( 0.03, 0.006, 0.002 ).mul( eyeMinorEdge ).mul( coldZone ).mul( emissiveIntensity ) );

			// Cell faces: slight warm variation so plates don't read as identical black

			const cellFace = adjustedIceCap.mul( sub( 1.0, eyeMajorEdge ) ).mul( sub( 1.0, poolMask ) );
			surfaceColor.addAssign( vec3( 0.025, 0.008, 0.004 ).mul( cellFace ).mul( coldZone ).mul( emissiveIntensity ) );

		} );

		// Atmospheric rim (uses shared applyAtmosphere with shadow)

		surfaceColor.assign( applyAtmosphere( surfaceColor, vWorldNormal, vWorldPosition ) );

		return vec4( surfaceColor, 1.0 );

	} );
	return { u_time, scale, color1, color2, color3, color4, u_atmosColor, u_cloudCoverage, u_cloudOpacity, u_cloudSwirl, u_cloudBands, u_cloudWarp, u_seaLevel, u_continentFreq, u_terrWarp, u_iceCapSize, u_iceEdge, u_iceWarp, u_iceDetail, u_coastDetail, u_landContrast, u_displace, u_bumpStrength, u_tidallyLocked, u_eyeAridEdge, u_eyeIceEdge, u_eyeIceBergDensity, u_iceOceanPolarFade, u_iceOceanEdgeNoise, u_iceOceanCrackDepth, u_eyeVegHue, u_eyeVegSat, u_eyeMoisture, emissiveColor, emissiveIntensity, u_lavaGlow, u_lavaCrackDepth, u_lavaPoolSize, u_lavaHeatGrad, u_useTextureMaps, dirToUV, computeContinent, fragMain };

}
