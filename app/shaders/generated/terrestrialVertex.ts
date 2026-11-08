// @ts-nocheck
/* eslint-disable */
// GENERATED — TSL port of the original GLSL (terrestrialVertexShader), produced with three's GLSL→TSL
// transpiler (examples/jsm/transpiler) and then adapted: uniforms arrive as TSL
// uniform nodes via `reference()`, varyings are injected by the host material.
// This file is now the source of truth; hand-edit as needed.

export default function build( TSL: any, uniforms: any, varyings: any, lib: any ): Record<string, any> {

	const { reference, atan, clamp, acos, vec2, Fn, float, vec3, sin, Loop, sub, abs, mul, pow, add, smoothstep, mix, dot, select, If, max, normalize, property, cross, length, vec4, modelViewMatrix } = TSL;
	const { vPosition, vSphereDir, vNormal, vWorldNormal, vWorldPosition } = varyings;
	const { u_lod, mod289v3, mod289v4, permute, taylorInvSqrt, fade, cnoise, pnoise3d, hash, hash3, noise, noise3d, fbm, fbm3d, hiFBM, hiRidged, hiInvRidged, hiCloud, ridgedNoise, cloudNoise, enhanceContrast, voronoi, craterProfile, sobelNormal, seededPos, u_sunDirection, u_ambient, u_lavaAmbient, u_wrapRange, u_wrapPower, u_sunIntensity, u_atmosDayColor, u_atmosTwilightColor, u_atmosIntensity, u_atmosFalloff, wrapDiffuse, fresnelAmbient, planetLighting, applyAtmosphere, fbm3d_lod, ridgedNoise_lod, cloudNoise_lod } = lib;

	const u_seed = reference( 'value', 'vec3', uniforms[ 'u_seed' ] );
	const u_displace = reference( 'value', 'float', uniforms[ 'u_displace' ] );
	const u_continentFreq = reference( 'value', 'float', uniforms[ 'u_continentFreq' ] );
	const u_terrWarp = reference( 'value', 'float', uniforms[ 'u_terrWarp' ] );
	const u_seaLevel = reference( 'value', 'float', uniforms[ 'u_seaLevel' ] );
	const u_coastDetail = reference( 'value', 'float', uniforms[ 'u_coastDetail' ] );
	const u_landContrast = reference( 'value', 'float', uniforms[ 'u_landContrast' ] );
	const u_vertLOD = reference( 'value', 'float', uniforms[ 'u_vertLOD' ] );
	const scale = reference( 'value', 'float', uniforms[ 'scale' ] );
	const u_useTextureMaps = reference( 'value', 'float', uniforms[ 'u_useTextureMaps' ] );
	const u_tidallyLocked = reference( 'value', 'float', uniforms[ 'u_tidallyLocked' ] );
	const u_sunDirectionLocal = reference( 'value', 'vec3', uniforms[ 'u_sunDirectionLocal' ] );
	const u_eyeAridEdge = reference( 'value', 'float', uniforms[ 'u_eyeAridEdge' ] );
	const u_lavaPoolSize = reference( 'value', 'float', uniforms[ 'u_lavaPoolSize' ] );

	// Equirectangular UV from sphere direction

	const dirToUV = /*@__PURE__*/ Fn( ( [ d ] ) => {

		const phi = atan( d.z, d.x );

		// [-π, π]

		const theta = acos( clamp( d.y, - 1.0, 1.0 ) );

		// [0, π]


		return vec2( phi.div( 2.0 * 3.14159265 ).add( 0.5 ), theta.div( 3.14159265 ) );

	} );

	// ── Perlin noise (same as fragment — must match exactly) ──
	// ── Vertex noise: exact mirrors of fragment hi* functions ──
	// Cloud noise: 4-octave for vertex (displacement doesn't need fine detail)
	// Same algorithm as fragment hiCloud but fewer octaves — shapes match, less detail

	const vCloud = /*@__PURE__*/ Fn( ( [ pos, frq, sd ] ) => {

		const n = float( 0.0 ), amp = float( 0.5 );
		const p = pos.mul( frq ).add( vec3( sd ) ).toVar();

		Loop( 4, ( { i } ) => {

			const s = pnoise3d( p ).toVar();
			s.assign( sin( s.mul( 5.0 ) ).mul( 0.5 ).add( 0.5 ) );
			n.addAssign( s.mul( amp ) );
			p.assign( p.mul( 2.02 ).add( vec3( float( i ).mul( 31.7 ), float( i ).mul( 17.3 ), float( i ).mul( 53.1 ) ) ) );
			amp.mulAssign( 0.5 );

		} );

		return clamp( n, 0.0, 1.0 );

	}, { pos: 'vec3', frq: 'float', sd: 'float', return: 'float' } );

	// Ridged: 4-octave for vertex displacement

	const vRidged = /*@__PURE__*/ Fn( ( [ pos, frq, sd ] ) => {

		const n = float( 0.0 ), amp = float( 0.5 );
		const p = pos.mul( frq ).add( vec3( sd ) ).toVar();

		Loop( 4, ( { i } ) => {

			const s = pnoise3d( p ).toVar();
			s.assign( mul( 2.0, sub( 0.5, abs( sub( 0.5, s ) ) ) ) );
			n.addAssign( s.mul( amp ) );
			p.assign( p.mul( 2.03 ).add( vec3( float( i ).mul( 13.7 ), float( i ).mul( 7.3 ), float( i ).mul( 19.1 ) ) ) );
			amp.mulAssign( 0.5 );

		} );

		return pow( clamp( n, 0.0, 1.0 ), 4.0 );

	}, { pos: 'vec3', frq: 'float', sd: 'float', return: 'float' } );

	// ── Height: exact mirror of fragment computeContinent ───────

	const computeHeight = /*@__PURE__*/ Fn( ( [ p, sphereDir ] ) => {

		// Same coordinate space as fragment: seededPos(dir, 100.0) * scale

		const sp = p.add( u_seed.mul( 100.0 ) ).mul( scale );
		const sd = u_seed.x.mul( 100.0 );

		// 3 sub-layers — must match fragment computeContinent exactly

		const sub1 = vCloud( sp, u_continentFreq.mul( 1.0 ), sd.add( 11.4 ) );
		const sub2 = vRidged( sp, u_continentFreq.mul( add( 1.0, u_coastDetail.mul( 3.0 ) ) ), sd.add( 29.4 ) );
		const sub3 = vCloud( sp, u_continentFreq.mul( 0.6 ), sd.add( 53.0 ) );

		// Domain warp

		const warp = vec3( sub1.sub( 0.5 ), sub2.sub( 0.5 ), sub3.sub( 0.5 ) ).mul( u_terrWarp ).mul( 0.4 );
		const n = vCloud( sp.add( warp ), u_continentFreq.mul( 0.8 ), sd.add( 78.2 ) ).toVar();

		// Blend ridged peaks via spatial mask

		const mask = smoothstep( 0.3, 0.7, sub3 );
		const ridgeMix = u_landContrast.mul( 0.3 );
		n.assign( mix( n, n.mul( sub( 1.0, ridgeMix ) ).add( sub2.mul( ridgeMix ) ), mask.mul( 0.7 ) ) );

		// Contrast push — must match fragment computeContinent

		const c = n.sub( u_seaLevel );
		n.assign( u_seaLevel.add( c.mul( add( 1.0, abs( c ).mul( 2.0 ) ) ) ) );
		n.assign( clamp( n, 0.0, 1.0 ) );

		// Land only — ocean stays flat
		// Ice/ocean eyeball: raise sea level on day side so displacement is suppressed (smooth ocean)

		const sl = u_seaLevel.toVar();

		If( u_tidallyLocked.greaterThan( 0.5 ).and( u_eyeAridEdge.greaterThan( 1.0 ) ), () => {

			const sunAngle = dot( sphereDir, u_sunDirectionLocal );
			const dayBoost = select( u_eyeAridEdge.greaterThan( 1.0 ).and( u_seaLevel.lessThan( 0.75 ) ), smoothstep( u_lavaPoolSize, u_lavaPoolSize.add( 0.6 ), sunAngle ), smoothstep( 0.0, 0.65, sunAngle ) );

			// ice: wider ocean

			sl.assign( mix( 0.05, select( u_eyeAridEdge.greaterThan( 1.0 ).and( u_seaLevel.lessThan( 0.75 ) ), 0.9, 1.0 ), dayBoost ) );

		} );

		return max( n.sub( sl ), 0.0 ).div( sub( 1.0, sl ).add( 0.001 ) );

	} );

	// ── Main — displacement + normals (texture or procedural) ──

	const main = /*@__PURE__*/ Fn( () => {

		const dir = normalize( position );
		vSphereDir.assign( dir );
		const displacedPos = position.toVar();
		const displacedNormal = normal.toVar();

		If( u_displace.greaterThan( 0.0 ), () => {

			const height = float( 0.0 ).toVar();

			If( u_useTextureMaps.greaterThan( 0.5 ), () => {

				// ── Texture path: single texture lookup ──

				const uv = dirToUV( dir );
				height.assign( 0.0 );

				// Convert heightfield to land-only displacement

				height.assign( max( height.sub( u_seaLevel ), 0.0 ).div( sub( 1.0, u_seaLevel ) ) );

			} ).Else( () => {

				// ── Procedural path: expensive per-vertex noise ──

				height.assign( computeHeight( dir, dir ) );

			} );

			displacedPos.assign( position.add( normal.mul( height ).mul( u_displace ) ) );

			// Forward-difference normal: 2 neighbors (3× computeHeight total)

			const up = select( abs( dir.y ).lessThan( 0.999 ), vec3( 0.0, 1.0, 0.0 ), vec3( 1.0, 0.0, 0.0 ) );
			const tangent = normalize( cross( up, dir ) );
			const bitangent = cross( dir, tangent );
			const eps = float( 0.003 );
			const r = length( position );
			const pT = normalize( dir.add( tangent.mul( eps ) ) );
			const pB = normalize( dir.add( bitangent.mul( eps ) ) );
			const posT = pT.mul( r ).add( pT.mul( computeHeight( pT, pT ) ).mul( u_displace ) );
			const posB = pB.mul( r ).add( pB.mul( computeHeight( pB, pB ) ).mul( u_displace ) );
			displacedNormal.assign( normalize( cross( posT.sub( displacedPos ), posB.sub( displacedPos ) ) ) );
			vPosition.assign( normalize( displacedPos ) );

		} ).Else( () => {

			vPosition.assign( dir );

		} );

		vNormal.assign( normalize( normalMatrix.mul( displacedNormal ) ) );
		vWorldNormal.assign( normalize( modelMatrix.mul( vec4( displacedNormal, 0.0 ) ).xyz ) );
		vWorldPosition.assign( modelMatrix.mul( vec4( displacedPos, 1.0 ) ).xyz );
		gl_Position.assign( projectionMatrix.mul( modelViewMatrix ).mul( vec4( displacedPos, 1.0 ) ) );

	} );
	return { u_seed, u_displace, u_continentFreq, u_terrWarp, u_seaLevel, u_coastDetail, u_landContrast, u_vertLOD, scale, u_useTextureMaps, u_tidallyLocked, u_sunDirectionLocal, u_eyeAridEdge, u_lavaPoolSize, dirToUV, vCloud, vRidged, computeHeight, main };

}
