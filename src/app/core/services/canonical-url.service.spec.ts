import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { CanonicalUrlService, SITE_ORIGIN } from './canonical-url.service';

@Component({ template: '' })
class EmptyPageComponent {}

const SITE = 'https://alasonora.example';

describe('CanonicalUrlService', () => {
  const canonicalLink = () => TestBed.inject(DOCUMENT).head.querySelector('link[rel="canonical"]');

  const setUp = async (siteOrigin: string) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: EmptyPageComponent }]),
        { provide: SITE_ORIGIN, useValue: siteOrigin },
      ],
    });
    TestBed.inject(CanonicalUrlService);
    await TestBed.inject(Router).navigateByUrl('/map?species=x#access_token=token');
  };

  afterEach(() => {
    canonicalLink()?.remove();
    TestBed.inject(Meta).removeTag('property="og:url"');
  });

  it('points canonical and og:url to the public origin, without query or hash', async () => {
    await setUp(SITE);

    expect(canonicalLink()?.getAttribute('href')).toBe(`${SITE}/map`);
    expect(TestBed.inject(Meta).getTag('property="og:url"')?.content).toBe(`${SITE}/map`);
  });

  it('publishes nothing when SITE_URL was not configured', async () => {
    await setUp('');

    expect(canonicalLink()).toBeNull();
    expect(TestBed.inject(Meta).getTag('property="og:url"')).toBeNull();
  });
});
