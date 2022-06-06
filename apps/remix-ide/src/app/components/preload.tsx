import { RemixApp } from '@remix-ui/app'
import React, { useEffect, useRef, useState } from 'react'
import { render } from 'react-dom'
import * as packageJson from '../../../../../package.json'
import { fileSystem, fileSystems } from '../files/fileSystem'
import { indexedDBFileSystem } from '../files/filesystems/indexedDB'
import { localStorageFS } from '../files/filesystems/localStorage'
import { fileSystemUtility, migrationTestData } from '../files/filesystems/fileSystemUtility'
import './styles/preload.css'
const _paq = window._paq = window._paq || []

export const Preload = () => {

    const [supported, setSupported] = useState<boolean>(true)
    const [error, setError] = useState<boolean>(false)
    const [showDownloader, setShowDownloader] = useState<boolean>(false)
    const remixFileSystems = useRef<fileSystems>(new fileSystems())
    const remixIndexedDB = useRef<fileSystem>(new indexedDBFileSystem())
    const localStorageFileSystem = useRef<fileSystem>(new localStorageFS())
    // url parameters to e2e test the fallbacks and error warnings
    const testmigrationFallback = useRef<boolean>(window.location.hash.includes('e2e_testmigration_fallback=true') && window.location.host === '127.0.0.1:8080' && window.location.protocol === 'http:')
    const testmigrationResult =  useRef<boolean>(window.location.hash.includes('e2e_testmigration=true') && window.location.host === '127.0.0.1:8080' && window.location.protocol === 'http:')
    const testBlockStorage =  useRef<boolean>(window.location.hash.includes('e2e_testblock_storage=true') && window.location.host === '127.0.0.1:8080' && window.location.protocol === 'http:')

    function loadAppComponent() {
        import('../../app').then((AppComponent) => {
            const appComponent = new AppComponent.default()
            appComponent.run().then(() => {
                render(
                    <>
                        <RemixApp app={appComponent} />
                    </>,
                    document.getElementById('root')
                )
            })
        }).catch(err => {
            _paq.push(['trackEvent', 'Preload', 'error', err && err.message])
            console.log('Error loading Remix:', err)
            setError(true)
        })
    }

    const downloadBackup = async () => {
        setShowDownloader(false)
        const fsUtility = new fileSystemUtility()
        await fsUtility.downloadBackup(remixFileSystems.current.fileSystems['localstorage'])
        await migrateAndLoad()
    }

    const migrateAndLoad = async () => {
        setShowDownloader(false)
        const fsUtility = new fileSystemUtility()
        const migrationResult = await fsUtility.migrate(localStorageFileSystem.current, remixIndexedDB.current)
        _paq.push(['trackEvent', 'Migrate', 'result', migrationResult?'success' : 'fail'])
        await setFileSystems()
    }

    const setFileSystems = async() => {
        const fsLoaded = await remixFileSystems.current.setFileSystem([(testmigrationFallback.current || testBlockStorage.current)? null: remixIndexedDB.current, testBlockStorage.current? null:localStorageFileSystem.current])
        if (fsLoaded) {
            console.log(fsLoaded.name + ' activated')
            _paq.push(['trackEvent', 'Storage', 'activate', fsLoaded.name])
            loadAppComponent()
        } else {
            _paq.push(['trackEvent', 'Storage', 'error', 'no supported storage'])
            setSupported(false)
        }
    }

    const testmigration = async() => {        
        if (testmigrationResult.current) {
            const fsUtility = new fileSystemUtility()
            fsUtility.populateWorkspace(migrationTestData, remixFileSystems.current.fileSystems['localstorage'].fs)
        }
    }

    useEffect(() => {
        async function loadStorage() {
            await remixFileSystems.current.addFileSystem(remixIndexedDB.current) || _paq.push(['trackEvent', 'Storage', 'error', 'indexedDB not supported'])
            await remixFileSystems.current.addFileSystem(localStorageFileSystem.current) || _paq.push(['trackEvent', 'Storage', 'error', 'localstorage not supported'])
            await testmigration()
            remixIndexedDB.current.loaded && await remixIndexedDB.current.checkWorkspaces()
            localStorageFileSystem.current.loaded && await localStorageFileSystem.current.checkWorkspaces()
            remixIndexedDB.current.loaded && ( (remixIndexedDB.current.hasWorkSpaces || !localStorageFileSystem.current.hasWorkSpaces)? await setFileSystems():setShowDownloader(true))
            !remixIndexedDB.current.loaded && await setFileSystems()
        }
        loadStorage()
    }, [])

    return <>
        <div className='preload-container'>
            <div className='preload-logo pb-4'>
                {logo}
                <div className="info-secondary splash">
                    CHAIN-CLOUD IDE
                    <br />
                    <span className='version'> v{packageJson.version}</span>
                </div>
            </div>
            {!supported ?
                <div className='preload-info-container alert alert-warning'>
                    Your browser does not support any of the filesystems required by Remix.
                    Either change the settings in your browser or use a supported browser.
                </div> : null}
            {error ?
                <div className='preload-info-container alert alert-danger text-left'>
                    An unknown error has occurred while loading the application.<br></br>
                    Doing a hard refresh might fix this issue:<br></br>
                    <div className='pt-2'>
                    Windows:<br></br>
                    - Chrome: CTRL + F5 or CTRL + Reload Button<br></br>
                    - Firefox: CTRL + SHIFT + R or CTRL + F5<br></br>
                    </div>
                    <div className='pt-2'>
                    MacOS:<br></br>
                    - Chrome & FireFox: CMD + SHIFT + R or SHIFT + Reload Button<br></br>
                    </div>
                    <div className='pt-2'>
                    Linux:<br></br>
                    - Chrome & FireFox: CTRL + SHIFT + R<br></br>
                    </div>
                </div> : null}
            {showDownloader ?
                <div className='preload-info-container alert alert-info'>
                    This app will be updated now. Please download a backup of your files now to make sure you don't lose your work.
                    <br></br>
                    You don't need to do anything else, your files will be available when the app loads.
                    <div onClick={async () => { await downloadBackup() }} data-id='downloadbackup-btn' className='btn btn-primary mt-1'>download backup</div>
                    <div onClick={async () => { await migrateAndLoad() }} data-id='skipbackup-btn' className='btn btn-primary mt-1'>skip backup</div>
                </div> : null}
            {(supported && !error && !showDownloader) ?
                <div>
                    <i className="fas fa-spinner fa-spin fa-2x"></i>
                </div> : null}
        </div>
    </>
}


const logo = <svg id="Ebene_2" data-name="Ebene 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 100">
<g id="页面-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
  <g id="2.0首页" transform="translate(-370.000000, -174.000000)" fill-rule="nonzero">
    <g id="banner_logo" transform="translate(370.000000, 174.000000)">
      <path d="M29.0978862,54.3482761 L7.62635892,44.8941365 C7.29366541,44.739573 7.06333913,44.4046852 7.06333913,44.0440368 L7.06333913,9.5505958 C7.06333913,9.08690504 7.52399168,8.80353846 7.93346062,8.98386264 L28.7651927,18.1546356 C29.1746616,18.3349598 29.6353142,18.0258326 29.6353142,17.5879024 L29.6353142,11.4053589 C29.6353142,11.0447105 29.4049879,10.6840621 29.0722944,10.5552591 L5.24632073,0.0706956639 C5.04158626,-0.00658613069 4.8368518,-0.00658613069 4.65770914,0.12221686 L0.281509893,3.00740386 C0.102367234,3.11044625 0,3.31653104 0,3.52261582 L0,46.6973784 C0,46.8777026 0.0511836169,47.0580268 0.153550851,47.2125904 L1.97056925,49.994735 C2.07293648,50.1492986 2.20089553,50.2781016 2.38003819,50.3296228 L28.7651927,61.9476526 C29.1746616,62.1279767 29.6353142,61.8188496 29.6353142,61.3809194 L29.6353142,55.1983758 C29.660906,54.8119669 29.4305797,54.4770791 29.0978862,54.3482761 Z" id="路径" fill="#1776FF"/>
      <path d="M63.9795211,0.0449350657 L40.1535475,10.5294985 C39.8208539,10.6840621 39.5905277,11.0189499 39.5905277,11.3795983 L39.5905277,17.5621418 C39.5905277,18.0258326 40.0511802,18.3091992 40.4606492,18.128875 L61.2923812,8.95810205 C61.7018502,8.77777786 62.1625027,9.08690504 62.1625027,9.52483521 L62.1625027,44.0182762 C62.1625027,44.3789246 61.9321764,44.739573 61.5994829,44.8683759 L40.1279556,54.3225155 C39.7952621,54.4770791 39.5649359,54.8119669 39.5649359,55.1726152 L39.5649359,61.3551588 C39.5649359,61.8188496 40.0255884,62.1022161 40.4350573,61.921892 L66.8202119,50.3038622 C66.9737627,50.2265804 67.1273136,50.0977774 67.2296808,49.9689744 L69.0466992,47.1868298 C69.1490664,47.0322662 69.20025,46.851942 69.20025,46.6716178 L69.20025,3.49685523 C69.20025,3.29077044 69.0978828,3.08468565 68.9187401,2.98164326 L64.5425409,0.0964562621 C64.4145819,-0.00658613069 64.1842556,-0.0323467289 63.9795211,0.0449350657 Z" id="路径" fill="#0059FF"/>
      <path d="M34.6257168,34.7444609 L12.9238633,25.1872789 C12.5143943,25.0069547 12.0537418,25.3160819 12.0537418,25.7540121 L12.0537418,31.9365556 C12.0537418,32.297204 12.2840681,32.6578524 12.6167616,32.7866554 L33.0390247,41.7771042 C33.1669837,41.8286254 33.2949428,41.854386 33.4229018,41.854386 L35.8541236,41.854386 C35.9820827,41.854386 36.1100417,41.8286254 36.2380008,41.7771042 L56.6602639,32.7866554 C56.9929574,32.6320918 57.2232837,32.297204 57.2232837,31.9365556 L57.2232837,25.7540121 C57.2232837,25.2903213 56.7626311,25.0069547 56.3531622,25.1872789 L34.6257168,34.7444609 Z" id="路径" fill="#000000"/>
    </g>
  </g>
</g>
</svg>
