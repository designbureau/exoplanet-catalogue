// @ts-nocheck
/* eslint-disable */
// GENERATED — TSL port of the original GLSL (noiseLib), produced with three's GLSL→TSL
// transpiler (examples/jsm/transpiler) and then adapted: uniforms arrive as TSL
// uniform nodes via `reference()`, varyings are injected by the host material.
// This file is now the source of truth; hand-edit as needed.

export default function build( TSL: any, uniforms: any, varyings: any, lib: any ): Record<string, any> {

	const { reference, floor, Fn, mul, sub, vec3, fract, vec4, abs, step, dot, mix, vec2, sin, float, cos, mat2, Loop, select, Break, If, clamp, pow, int, length, smoothstep, normalize, cameraPosition, max } = TSL;


	const u_seed = reference( 'value', 'vec3', uniforms[ 'u_seed' ] );
	const u_lod = reference( 'value', 'float', uniforms[ 'u_lod' ] );

	const mod289v3 = /*@__PURE__*/ Fn( ( [ x ] ) => {

		return x.sub( floor( x.mul( 1.0 / 289.0 ) ).mul( 289.0 ) );

	}, { x: 'vec3', return: 'vec3' } );

	const mod289v4 = /*@__PURE__*/ Fn( ( [ x ] ) => {

		return x.sub( floor( x.mul( 1.0 / 289.0 ) ).mul( 289.0 ) );

	}, { x: 'vec4', return: 'vec4' } );

	const permute = /*@__PURE__*/ Fn( ( [ x ] ) => {

		return mod289v4( x.mul( 34.0 ).add( 10.0 ).mul( x ) );

	}, { x: 'vec4', return: 'vec4' } );

	const taylorInvSqrt = /*@__PURE__*/ Fn( ( [ r ] ) => {

		return sub( 1.79284291400159, mul( 0.85373472095314, r ) );

	}, { r: 'vec4', return: 'vec4' } );

	const fade = /*@__PURE__*/ Fn( ( [ t ] ) => {

		return t.mul( t ).mul( t ).mul( t.mul( t.mul( 6.0 ).sub( 15.0 ) ).add( 10.0 ) );

	}, { t: 'vec3', return: 'vec3' } );

	const cnoise = /*@__PURE__*/ Fn( ( [ P ] ) => {

		const Pi0 = floor( P ).toVar();
		const Pi1 = Pi0.add( vec3( 1.0 ) ).toVar();
		Pi0.assign( mod289v3( Pi0 ) );
		Pi1.assign( mod289v3( Pi1 ) );
		const Pf0 = fract( P );
		const Pf1 = Pf0.sub( vec3( 1.0 ) );
		const ix = vec4( Pi0.x, Pi1.x, Pi0.x, Pi1.x );
		const iy = vec4( Pi0.yy, Pi1.yy );
		const iz0 = Pi0.zzzz;
		const iz1 = Pi1.zzzz;
		const ixy = permute( permute( ix ).add( iy ) );
		const ixy0 = permute( ixy.add( iz0 ) );
		const ixy1 = permute( ixy.add( iz1 ) );
		const gx0 = ixy0.mul( 1.0 / 7.0 ).toVar();
		const gy0 = fract( floor( gx0 ).mul( 1.0 / 7.0 ) ).sub( 0.5 ).toVar();
		gx0.assign( fract( gx0 ) );
		const gz0 = vec4( 0.5 ).sub( abs( gx0 ) ).sub( abs( gy0 ) );
		const sz0 = step( gz0, vec4( 0.0 ) );
		gx0.subAssign( sz0.mul( step( 0.0, gx0 ).sub( 0.5 ) ) );
		gy0.subAssign( sz0.mul( step( 0.0, gy0 ).sub( 0.5 ) ) );
		const gx1 = ixy1.mul( 1.0 / 7.0 ).toVar();
		const gy1 = fract( floor( gx1 ).mul( 1.0 / 7.0 ) ).sub( 0.5 ).toVar();
		gx1.assign( fract( gx1 ) );
		const gz1 = vec4( 0.5 ).sub( abs( gx1 ) ).sub( abs( gy1 ) );
		const sz1 = step( gz1, vec4( 0.0 ) );
		gx1.subAssign( sz1.mul( step( 0.0, gx1 ).sub( 0.5 ) ) );
		gy1.subAssign( sz1.mul( step( 0.0, gy1 ).sub( 0.5 ) ) );
		const g000 = vec3( gx0.x, gy0.x, gz0.x );
		const g100 = vec3( gx0.y, gy0.y, gz0.y );
		const g010 = vec3( gx0.z, gy0.z, gz0.z );
		const g110 = vec3( gx0.w, gy0.w, gz0.w );
		const g001 = vec3( gx1.x, gy1.x, gz1.x );
		const g101 = vec3( gx1.y, gy1.y, gz1.y );
		const g011 = vec3( gx1.z, gy1.z, gz1.z );
		const g111 = vec3( gx1.w, gy1.w, gz1.w );
		const norm0 = taylorInvSqrt( vec4( dot( g000, g000 ), dot( g010, g010 ), dot( g100, g100 ), dot( g110, g110 ) ) );
		const norm1 = taylorInvSqrt( vec4( dot( g001, g001 ), dot( g011, g011 ), dot( g101, g101 ), dot( g111, g111 ) ) );
		const n000 = norm0.x.mul( dot( g000, Pf0 ) );
		const n010 = norm0.y.mul( dot( g010, vec3( Pf0.x, Pf1.y, Pf0.z ) ) );
		const n100 = norm0.z.mul( dot( g100, vec3( Pf1.x, Pf0.yz ) ) );
		const n110 = norm0.w.mul( dot( g110, vec3( Pf1.xy, Pf0.z ) ) );
		const n001 = norm1.x.mul( dot( g001, vec3( Pf0.xy, Pf1.z ) ) );
		const n011 = norm1.y.mul( dot( g011, vec3( Pf0.x, Pf1.yz ) ) );
		const n101 = norm1.z.mul( dot( g101, vec3( Pf1.x, Pf0.y, Pf1.z ) ) );
		const n111 = norm1.w.mul( dot( g111, Pf1 ) );
		const fade_xyz = fade( Pf0 );
		const n_z = mix( vec4( n000, n100, n010, n110 ), vec4( n001, n101, n011, n111 ), fade_xyz.z );
		const n_yz = mix( n_z.xy, n_z.zw, fade_xyz.y );
		const n_xyz = mix( n_yz.x, n_yz.y, fade_xyz.x );

		return mul( 2.2, n_xyz );

	}, { P: 'vec3', return: 'float' } );

	// [0,1] wrapper for pipeline compatibility

	const pnoise3d = /*@__PURE__*/ Fn( ( [ p ] ) => {

		return cnoise( p ).mul( 0.5 ).add( 0.5 );

	}, { p: 'vec3', return: 'float' } );

	// Legacy hash-based value noise (kept for 2D noise, voronoi, etc.)

	const hash = /*@__PURE__*/ Fn( ( [ p ] ) => {

		return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ).mul( 43758.5453123 ) );

	}, { p: 'vec2', return: 'float' } );

	const hash3 = /*@__PURE__*/ Fn( ( [ p ] ) => {

		return fract( sin( dot( p, vec3( 127.1, 311.7, 74.7 ) ) ).mul( 43758.5453123 ) );

	}, { p: 'vec3', return: 'float' } );

	const noise = /*@__PURE__*/ Fn( ( [ p ] ) => {

		const i = floor( p );
		const f = fract( p );
		const u = f.mul( f ).mul( sub( 3.0, mul( 2.0, f ) ) );

		return mix( mix( hash( i ), hash( i.add( vec2( 1.0, 0.0 ) ) ), u.x ), mix( hash( i.add( vec2( 0.0, 1.0 ) ) ), hash( i.add( vec2( 1.0, 1.0 ) ) ), u.x ), u.y );

	}, { p: 'vec2', return: 'float' } );

	// noise3d now uses Perlin noise — smooth at all frequencies

	const noise3d = /*@__PURE__*/ Fn( ( [ p ] ) => {

		return pnoise3d( p );

	}, { p: 'vec3', return: 'float' } );

	const fbm = /*@__PURE__*/ Fn( ( [ p_immutable ] ) => {

		const p = p_immutable.toVar();
		const v = float( 0.0 ), a = float( 0.5 );
		const rot = mat2( cos( 0.5 ), sin( 0.5 ), sin( 0.5 ).negate(), cos( 0.5 ) );

		Loop( 4, () => {

			v.addAssign( a.mul( noise( p ) ) );
			p.assign( rot.mul( p ).mul( 2.0 ).add( vec2( 100.0 ) ) );
			a.mulAssign( 0.5 );

		} );

		return v;

	}, { p: 'vec2', return: 'float' } );

	const fbm3d = /*@__PURE__*/ Fn( ( [ p_immutable ] ) => {

		const p = p_immutable.toVar();
		const v = float( 0.0 ), a = float( 0.5 );

		Loop( 3, () => {

			v.addAssign( a.mul( noise3d( p ) ) );
			p.assign( p.mul( 2.01 ).add( vec3( 100.0 ) ) );
			a.mulAssign( 0.5 );

		} );

		return v;

	} );

	// ── High-detail noise (Perlin-based, LOD-aware: 8 oct close, 3 oct far) ──
	// Octaves 7-8 each contribute under ~1% of the raw range, but the contrast
	// boost in hiFBM and the pow4 sharpen in hiRidged amplify them into visible
	// micro-detail on close-up surfaces (catalogue thumbs, masthead).
	// Base FBM: 8/3-octave, contrast-boosted

	const hiFBM = /*@__PURE__*/ Fn( ( [ pos, frq, sd ] ) => {

		const n = float( 0.0 ), amp = float( 0.5 );
		const p = pos.mul( frq ).add( vec3( sd ) ).toVar();
		const oct = select( u_lod.greaterThan( 0.5 ), 8, 3 );

		Loop( 8, ( { i } ) => {

			If( i.greaterThanEqual( oct ), () => {

				Break();

			} );

			n.addAssign( pnoise3d( p ).mul( amp ) );
			p.assign( p.mul( 2.03 ).add( vec3( float( i ).mul( 13.7 ), float( i ).mul( 7.3 ), float( i ).mul( 19.1 ) ) ) );
			amp.mulAssign( 0.5 );

		} );

		return clamp( n.sub( 0.5 ).mul( 2.0 ).add( 0.5 ), 0.0, 1.0 );

	} );

	// Ridged: 8/3-octave, ridge-folded, pow4 sharpened

	const hiRidged = /*@__PURE__*/ Fn( ( [ pos, frq, sd ] ) => {

		const n = float( 0.0 ), amp = float( 0.5 );
		const p = pos.mul( frq ).add( vec3( sd ) ).toVar();
		const oct = select( u_lod.greaterThan( 0.5 ), 8, 3 );

		Loop( 8, ( { i } ) => {

			If( i.greaterThanEqual( oct ), () => {

				Break();

			} );

			const s = pnoise3d( p ).toVar();
			s.assign( mul( 2.0, sub( 0.5, abs( sub( 0.5, s ) ) ) ) );
			n.addAssign( s.mul( amp ) );
			p.assign( p.mul( 2.03 ).add( vec3( float( i ).mul( 13.7 ), float( i ).mul( 7.3 ), float( i ).mul( 19.1 ) ) ) );
			amp.mulAssign( 0.5 );

		} );

		return pow( clamp( n, 0.0, 1.0 ), 4.0 );

	} );

	// Inverted ridged: valleys instead of peaks

	const hiInvRidged = /*@__PURE__*/ Fn( ( [ pos, frq, sd ] ) => {

		return sub( 1.0, hiRidged( pos, frq, sd ) );

	} );

	// Cloud noise: 8/3-octave sin-modulated for organic shapes

	const hiCloud = /*@__PURE__*/ Fn( ( [ pos, frq, sd ] ) => {

		const n = float( 0.0 ), amp = float( 0.5 );
		const p = pos.mul( frq ).add( vec3( sd ) ).toVar();
		const oct = select( u_lod.greaterThan( 0.5 ), 8, 3 );

		Loop( 8, ( { i } ) => {

			If( i.greaterThanEqual( oct ), () => {

				Break();

			} );

			const s = pnoise3d( p ).toVar();
			s.assign( sin( s.mul( 5.0 ) ).mul( 0.5 ).add( 0.5 ) );
			n.addAssign( s.mul( amp ) );
			p.assign( p.mul( 2.02 ).add( vec3( float( i ).mul( 31.7 ), float( i ).mul( 17.3 ), float( i ).mul( 53.1 ) ) ) );
			amp.mulAssign( 0.5 );

		} );

		return clamp( n, 0.0, 1.0 );

	} );

	// ── Legacy noise (used by non-terrestrial shaders, LOD paths) ────
	// Ridged noise: 4-octave (cheaper, for bump layers)

	const ridgedNoise = /*@__PURE__*/ Fn( ( [ p_immutable, freq ] ) => {

		const p = p_immutable.toVar();
		const v = float( 0.0 ), a = float( 0.5 );
		p.assign( p.mul( freq ) );

		Loop( 4, () => {

			const n = noise3d( p ).toVar();
			n.assign( mul( 2.0, sub( 0.5, abs( sub( 0.5, n ) ) ) ) );
			v.addAssign( a.mul( n ) );
			p.assign( p.mul( 2.03 ).add( vec3( 13.7, 29.3, 41.1 ) ) );
			a.mulAssign( 0.5 );

		} );

		return pow( clamp( v, 0.0, 1.0 ), 3.0 );

	}, { p: 'vec3', freq: 'float', return: 'float' } );

	// Cloud noise: 4-octave (cheaper, for bump/cloud layers)

	const cloudNoise = /*@__PURE__*/ Fn( ( [ p_immutable, freq ] ) => {

		const p = p_immutable.toVar();
		const v = float( 0.0 ), a = float( 0.5 );
		p.assign( p.mul( freq ) );

		Loop( 4, () => {

			const n = noise3d( p ).toVar();
			v.addAssign( a.mul( sin( n.mul( 5.0 ) ).mul( 0.5 ).add( 0.5 ) ) );
			p.assign( p.mul( 2.02 ).add( vec3( 31.7, 17.3, 53.1 ) ) );
			a.mulAssign( 0.5 );

		} );

		return v;

	}, { p: 'vec3', freq: 'float', return: 'float' } );

	// Contrast enhancement for sharper terrain boundaries

	const enhanceContrast = /*@__PURE__*/ Fn( ( [ n, center, strength ] ) => {

		return clamp( n.sub( center ).mul( strength ).add( center ), 0.0, 1.0 );

	}, { n: 'float', center: 'float', strength: 'float', return: 'float' } );

	// Voronoi / cellular noise for craters

	const voronoi = /*@__PURE__*/ Fn( ( [ p ] ) => {

		const i = floor( p );
		const f = fract( p );
		const d1 = float( 1.0 ), d2 = float( 1.0 );

		Loop( { start: int( - 1 ), end: 1, name: 'x', condition: '<=' }, ( { x } ) => {

			Loop( { start: int( - 1 ), end: 1, name: 'y', condition: '<=' }, ( { y } ) => {

				Loop( { start: int( - 1 ), end: 1, name: 'z', condition: '<=' }, ( { z } ) => {

					const neighbor = vec3( float( x ), float( y ), float( z ) );
					const point = vec3( hash3( i.add( neighbor ) ), hash3( i.add( neighbor ).add( vec3( 37.0 ) ) ), hash3( i.add( neighbor ).add( vec3( 71.0 ) ) ) ).mul( 0.8 ).add( 0.1 );
					const d = length( neighbor.add( point ).sub( f ) );

					If( d.lessThan( d1 ), () => {

						d2.assign( d1 );
						d1.assign( d );

					} ).ElseIf( d.lessThan( d2 ), () => {

						d2.assign( d );

					} );

				} );

			} );

		} );

		return vec2( d1, d2 );

	}, { p: 'vec3', return: 'vec2' } );

	// Crater profile: depression in centre, raised rim, falloff

	const craterProfile = /*@__PURE__*/ Fn( ( [ d, size ] ) => {

		const r = d.div( size );

		If( r.greaterThan( 1.2 ), () => {

			return 0.0;

		} );

		// Smooth rim + bowl with no sharp transitions

		const rim = mul( 0.15, smoothstep( 0.6, 0.9, r ) ).mul( sub( 1.0, smoothstep( 0.9, 1.2, r ) ) );
		const bowl = float( -0.3 ).mul( sub( 1.0, smoothstep( 0.0, 0.7, r ) ) );

		return rim.add( bowl );

	}, { d: 'float', size: 'float', return: 'float' } );

	// Sobel-style bump normal from height field (6-sample for better quality)

	const sobelNormal = /*@__PURE__*/ Fn( ( [ p, eps, strength ] ) => {

		const h00 = noise3d( p.add( vec3( eps.negate(), eps.negate(), 0.0 ) ) );
		const h10 = noise3d( p.add( vec3( 0.0, eps.negate(), 0.0 ) ) );
		const h20 = noise3d( p.add( vec3( eps, eps.negate(), 0.0 ) ) );
		const h01 = noise3d( p.add( vec3( eps.negate(), 0.0, 0.0 ) ) );
		const h21 = noise3d( p.add( vec3( eps, 0.0, 0.0 ) ) );
		const h02 = noise3d( p.add( vec3( eps.negate(), eps, 0.0 ) ) );
		const h12 = noise3d( p.add( vec3( 0.0, eps, 0.0 ) ) );
		const h22 = noise3d( p.add( vec3( eps, eps, 0.0 ) ) );
		const dX = h20.add( mul( 2.0, h21 ) ).add( h22 ).sub( h00.add( mul( 2.0, h01 ) ).add( h02 ) );
		const dY = h02.add( mul( 2.0, h12 ) ).add( h22 ).sub( h00.add( mul( 2.0, h10 ) ).add( h20 ) );

		return normalize( vec3( dX.negate().mul( strength ), dY.negate().mul( strength ), 1.0 ) );

	}, { p: 'vec3', eps: 'float', strength: 'float', return: 'vec3' } );

	// Seed-offset helper: each planet samples different noise regions

	const seededPos = /*@__PURE__*/ Fn( ( [ p, s ] ) => {

		return p.add( u_seed.mul( s ) );

	} );

	// Atmosphere fresnel helper

	const u_sunDirection = reference( 'value', 'vec3', uniforms[ 'u_sunDirection' ] );
	const u_sunDirectionLocal = reference( 'value', 'vec3', uniforms[ 'u_sunDirectionLocal' ] );

	// object-space sun direction for eyeball biomes

	const u_ambient = reference( 'value', 'float', uniforms[ 'u_ambient' ] );
	const u_lavaAmbient = reference( 'value', 'float', uniforms[ 'u_lavaAmbient' ] );
	const u_wrapRange = reference( 'value', 'float', uniforms[ 'u_wrapRange' ] );
	const u_wrapPower = reference( 'value', 'float', uniforms[ 'u_wrapPower' ] );
	const u_sunIntensity = reference( 'value', 'float', uniforms[ 'u_sunIntensity' ] );
	const u_atmosDayColor = reference( 'value', 'color', uniforms[ 'u_atmosDayColor' ] );
	const u_atmosTwilightColor = reference( 'value', 'color', uniforms[ 'u_atmosTwilightColor' ] );
	const u_atmosIntensity = reference( 'value', 'float', uniforms[ 'u_atmosIntensity' ] );
	const u_atmosFalloff = reference( 'value', 'float', uniforms[ 'u_atmosFalloff' ] );

	// Wrap lighting + fresnel ambient for realistic dark-side falloff

	const wrapDiffuse = /*@__PURE__*/ Fn( ( [ N, L ] ) => {

		const wrap = dot( N, L ).mul( u_wrapRange ).add( u_wrapRange );

		return clamp( pow( wrap, u_wrapPower ), 0.0, 1.0 );

	} );

	const fresnelAmbient = /*@__PURE__*/ Fn( ( [ N, V ] ) => {

		const f = sub( 1.0, abs( dot( N, V ) ) );

		return f.mul( f );

	}, { N: 'vec3', V: 'vec3', return: 'float' } );

	const planetLighting = /*@__PURE__*/ Fn( ( [ color, N, L, V, ambient ] ) => {

		const diff = wrapDiffuse( N, L );
		const rim = fresnelAmbient( N, V );
		const light = diff.add( ambient.mul( rim ).mul( sub( 1.0, diff ) ) );

		return color.mul( light ).mul( u_sunIntensity );

	} );

	const applyAtmosphere = /*@__PURE__*/ Fn( ( [ color, normal, worldPos ] ) => {

		const viewDir = normalize( cameraPosition.sub( worldPos ) );
		const fresnel = sub( 1.0, max( dot( viewDir, normal ), 0.0 ) ).toVar();
		fresnel.assign( pow( fresnel, u_atmosFalloff ) );
		const sunOrientation = dot( normal, u_sunDirection );

		// Day colour blend: transitions across full lit hemisphere

		const atmosphereDayMix = smoothstep( - 0.5, 1.0, sunOrientation );
		const atmosColor = mix( u_atmosTwilightColor, u_atmosDayColor, atmosphereDayMix );

		// Match planet surface wrap lighting for consistent shadow terminator

		const dayVisibility = wrapDiffuse( normal, u_sunDirection );

		// Atmosphere fades to black in shadow — both colour and blend strength

		const litAtmos = atmosColor.mul( dayVisibility );

		return mix( color, litAtmos, fresnel.mul( u_atmosIntensity ) );

	} );

	// LOD-aware noise: fewer octaves when u_lod is 0

	const fbm3d_lod = /*@__PURE__*/ Fn( ( [ p_immutable ] ) => {

		const p = p_immutable.toVar();
		const v = float( 0.0 ), a = float( 0.5 );
		const octaves = select( u_lod.greaterThan( 0.5 ), 4, 2 );

		Loop( 4, ( { i } ) => {

			If( i.greaterThanEqual( octaves ), () => {

				Break();

			} );

			v.addAssign( a.mul( noise3d( p ) ) );
			p.assign( p.mul( 2.01 ).add( vec3( 100.0 ) ) );
			a.mulAssign( 0.5 );

		} );

		return v;

	} );

	const ridgedNoise_lod = /*@__PURE__*/ Fn( ( [ p_immutable, freq ] ) => {

		const p = p_immutable.toVar();
		const v = float( 0.0 ), a = float( 0.5 );
		p.assign( p.mul( freq ) );
		const octaves = select( u_lod.greaterThan( 0.5 ), 4, 2 );

		Loop( 4, ( { i } ) => {

			If( i.greaterThanEqual( octaves ), () => {

				Break();

			} );

			const n = noise3d( p ).toVar();
			n.assign( mul( 2.0, sub( 0.5, abs( sub( 0.5, n ) ) ) ) );
			v.addAssign( a.mul( n ) );
			p.assign( p.mul( 2.03 ).add( vec3( 13.7, 29.3, 41.1 ) ) );
			a.mulAssign( 0.5 );

		} );

		return pow( clamp( v, 0.0, 1.0 ), 3.0 );

	} );

	const cloudNoise_lod = /*@__PURE__*/ Fn( ( [ p_immutable, freq ] ) => {

		const p = p_immutable.toVar();
		const v = float( 0.0 ), a = float( 0.5 );
		p.assign( p.mul( freq ) );
		const octaves = select( u_lod.greaterThan( 0.5 ), 4, 2 );

		Loop( 4, ( { i } ) => {

			If( i.greaterThanEqual( octaves ), () => {

				Break();

			} );

			const n = noise3d( p ).toVar();
			v.addAssign( a.mul( sin( n.mul( 5.0 ) ).mul( 0.5 ).add( 0.5 ) ) );
			p.assign( p.mul( 2.02 ).add( vec3( 31.7, 17.3, 53.1 ) ) );
			a.mulAssign( 0.5 );

		} );

		return v;

	} );
	return { u_seed, u_lod, mod289v3, mod289v4, permute, taylorInvSqrt, fade, cnoise, pnoise3d, hash, hash3, noise, noise3d, fbm, fbm3d, hiFBM, hiRidged, hiInvRidged, hiCloud, ridgedNoise, cloudNoise, enhanceContrast, voronoi, craterProfile, sobelNormal, seededPos, u_sunDirection, u_sunDirectionLocal, u_ambient, u_lavaAmbient, u_wrapRange, u_wrapPower, u_sunIntensity, u_atmosDayColor, u_atmosTwilightColor, u_atmosIntensity, u_atmosFalloff, wrapDiffuse, fresnelAmbient, planetLighting, applyAtmosphere, fbm3d_lod, ridgedNoise_lod, cloudNoise_lod };

}
